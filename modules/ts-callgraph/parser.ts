import * as path from "https://deno.land/std/path/mod.ts";
import { CallGraph } from "./callgraph.ts";
import type { CallInfo, NodeInfo } from "./types.ts";
import { ts } from "./deps.ts";

// ファイルを読み込んでTypeScriptのプログラムを作成
export function createProgram(filePath: string): ts.Program {
  const absolutePath = path.resolve(filePath as string);

  // TypeScriptのコンパイラオプション
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    allowJs: true,
    checkJs: true,
  };

  // プログラムの作成
  const program = ts.createProgram([absolutePath], compilerOptions);
  return program;
}

// ソースファイルからコールグラフを生成
export function generateCallGraph(
  program: ts.Program,
  maxDepth: number = Infinity,
  verbose: boolean = false,
): CallGraph {
  const callGraph = new CallGraph();
  const typeChecker = program.getTypeChecker();

  // 処理済みのノードパスを保存（再帰制限のため）
  const visitedNodes = new Set<string>();

  // ノードの深さを追跡
  const nodeDepth = new Map<string, number>();

  // ソースファイルを巡回
  for (const sourceFile of program.getSourceFiles()) {
    // 外部ライブラリは除外
    if (sourceFile.isDeclarationFile) continue;

    // ファイルパスをログ出力
    if (verbose) {
      console.log(`Processing file: ${sourceFile.fileName}`);
    }

    // 型情報や追加情報を取得するヘルパー関数
    function getNodeTypeString(node: ts.Node): string | undefined {
      try {
        const type = typeChecker.getTypeAtLocation(node);
        return typeChecker.typeToString(type);
      } catch (e) {
        return undefined;
      }
    }

    function getDocComment(node: ts.Node): string | undefined {
      const commentRanges = ts.getLeadingCommentRanges(
        sourceFile.text,
        node.getFullStart(),
      );

      if (!commentRanges || commentRanges.length === 0) {
        return undefined;
      }

      return commentRanges
        .map((range) => {
          const comment = sourceFile.text.substring(range.pos, range.end);
          return comment.startsWith("/*")
            ? comment.replace(/^\/\*\*?/, "").replace(/\*\/$/, "").trim()
            : comment.replace(/^\/\/\s*/, "").trim();
        })
        .join("\n");
    }

    function isNodeExported(node: ts.Declaration): boolean {
      // Deferred function to check if node has export modifier
      const modifiers = ts.canHaveModifiers(node)
        ? ts.getModifiers(node)
        : undefined;

      if (modifiers) {
        for (const modifier of modifiers) {
          if (modifier.kind === ts.SyntaxKind.ExportKeyword) {
            return true;
          }
        }
      }

      // Check if parent is export declaration
      const parent = node.parent;
      return ts.isSourceFile(parent) ||
        (ts.isModuleBlock(parent) && ts.isModuleDeclaration(parent.parent) &&
          !!parent.parent.name);
    }

    // ノードの巡回
    function visit(
      node: ts.Node,
      currentScope: string | undefined,
      depth: number = 0,
    ) {
      // 最大深さのチェック
      if (depth > maxDepth) {
        return;
      }

      // クラス、インターフェース、型エイリアスなどを検出
      if (ts.isClassDeclaration(node) && node.name) {
        const className = node.name.text;
        console.log(`Found class: ${className}`);
        const isExported = isNodeExported(node);
        const docComment = getDocComment(node);

        // 継承関係の検出
        let superClass: string | undefined;
        if (node.heritageClauses) {
          for (const clause of node.heritageClauses) {
            if (
              clause.token === ts.SyntaxKind.ExtendsKeyword &&
              clause.types.length > 0
            ) {
              const extendsType = clause.types[0];
              if (ts.isIdentifier(extendsType.expression)) {
                superClass = extendsType.expression.text;
              }
              console.log(`Class ${className} extends ${superClass}`);
            }
          }
        }

        // インターフェース実装の検出
        const implementsInterfaces: string[] = [];
        if (node.heritageClauses) {
          for (const clause of node.heritageClauses) {
            if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
              for (const type of clause.types) {
                if (ts.isIdentifier(type.expression)) {
                  implementsInterfaces.push(type.expression.text);
                  console.log(
                    `Class ${className} implements ${type.expression.text}`,
                  );
                }
              }
            }
          }
        }

        callGraph.addNode(className, {
          kind: "class",
          isExported,
          docComment,
          sourceFile: sourceFile.fileName,
          superClass,
          implementsInterfaces: implementsInterfaces.length > 0
            ? implementsInterfaces
            : undefined,
        });

        // クラスのメンバーを処理
        for (const member of node.members) {
          // コンストラクタの処理
          if (ts.isConstructorDeclaration(member)) {
            const constructorName = `${className}.constructor`;
            const docComment = getDocComment(member);
            const typeString = getNodeTypeString(member);

            callGraph.addNode(constructorName, {
              kind: "constructor",
              type: typeString,
              docComment,
              sourceFile: sourceFile.fileName,
              isExported,
              parentClass: className,
            });

            // コンストラクタ本体を処理
            if (member.body) {
              const prevScope = currentScope;
              currentScope = constructorName;
              nodeDepth.set(currentScope, depth);
              ts.forEachChild(
                member.body,
                (n) => visit(n, currentScope, depth + 1),
              );
              currentScope = prevScope;
            }
          } // メソッドの処理
          else if (ts.isMethodDeclaration(member) && member.name) {
            let methodName = `${className}.`;

            if (ts.isIdentifier(member.name)) {
              methodName += member.name.text;
            } else {
              methodName += "<computed>";
            }

            const docComment = getDocComment(member);
            const typeString = getNodeTypeString(member);

            // 静的メソッドかどうかを判定
            const modifiers = ts.canHaveModifiers(member)
              ? ts.getModifiers(member)
              : undefined;
            const isStatic = modifiers?.some((m) =>
              m.kind === ts.SyntaxKind.StaticKeyword
            ) ?? false;

            callGraph.addNode(methodName, {
              kind: "method",
              type: typeString,
              docComment,
              sourceFile: sourceFile.fileName,
              isExported,
              isStatic,
              parentClass: className,
            });

            // メソッド本体を処理
            if (member.body) {
              const prevScope = currentScope;
              currentScope = methodName;
              nodeDepth.set(currentScope, depth);
              ts.forEachChild(
                member.body,
                (n) => visit(n, currentScope, depth + 1),
              );
              currentScope = prevScope;
            }
          } // プロパティの処理
          else if (ts.isPropertyDeclaration(member) && member.name) {
            let propertyName = `${className}.`;

            if (ts.isIdentifier(member.name)) {
              propertyName += member.name.text;
            } else {
              propertyName += "<computed>";
            }

            const docComment = getDocComment(member);
            const typeString = getNodeTypeString(member);

            // 静的プロパティかどうかを判定
            const modifiers = ts.canHaveModifiers(member)
              ? ts.getModifiers(member)
              : undefined;
            const isStatic = modifiers?.some((m) =>
              m.kind === ts.SyntaxKind.StaticKeyword
            ) ?? false;

            callGraph.addNode(propertyName, {
              kind: "property",
              type: typeString,
              docComment,
              sourceFile: sourceFile.fileName,
              isExported,
              isStatic,
              parentClass: className,
            });

            // 初期化式があれば処理
            if (member.initializer) {
              const prevScope = currentScope;
              currentScope = propertyName;
              nodeDepth.set(currentScope, depth);
              visit(member.initializer, currentScope, depth + 1);
              currentScope = prevScope;
            }
          }
        }
      }

      // クラス式の処理
      if (ts.isClassExpression(node)) {
        // クラス式の名前を取得
        let className: string;
        if (node.name) {
          className = node.name.text;
        } else {
          // 無名クラス式の場合は位置情報を名前にする
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(
            node.getStart(),
          );
          className = `anonymousClass_${
            sourceFile.fileName.split("/").pop()
          }_${line}_${character}`;
        }

        // 親変数名を取得（const MyClass = class {...} の MyClass 部分）
        let parentVarName: string | undefined;
        if (
          ts.isVariableDeclaration(node.parent) &&
          ts.isIdentifier(node.parent.name)
        ) {
          parentVarName = node.parent.name.text;

          // 親変数名をクラス名として使用
          className = parentVarName;
        }

        // 継承関係の検出
        let superClass: string | undefined;
        if (node.heritageClauses) {
          for (const clause of node.heritageClauses) {
            if (
              clause.token === ts.SyntaxKind.ExtendsKeyword &&
              clause.types.length > 0
            ) {
              const extendsType = clause.types[0];
              if (ts.isIdentifier(extendsType.expression)) {
                superClass = extendsType.expression.text;
              }
            }
          }
        }

        // インターフェース実装の検出
        const implementsInterfaces: string[] = [];
        if (node.heritageClauses) {
          for (const clause of node.heritageClauses) {
            if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
              for (const type of clause.types) {
                if (ts.isIdentifier(type.expression)) {
                  implementsInterfaces.push(type.expression.text);
                }
              }
            }
          }
        }

        const docComment = getDocComment(node);

        callGraph.addNode(className, {
          kind: "class",
          docComment,
          sourceFile: sourceFile.fileName,
          superClass,
          implementsInterfaces: implementsInterfaces.length > 0
            ? implementsInterfaces
            : undefined,
        });

        // クラスのメンバーを処理
        for (const member of node.members) {
          // コンストラクタの処理
          if (ts.isConstructorDeclaration(member)) {
            const constructorName = `${className}.constructor`;
            const docComment = getDocComment(member);
            const typeString = getNodeTypeString(member);

            callGraph.addNode(constructorName, {
              kind: "constructor",
              type: typeString,
              docComment,
              sourceFile: sourceFile.fileName,
              parentClass: className,
            });

            // コンストラクタ本体を処理
            if (member.body) {
              const prevScope = currentScope;
              currentScope = constructorName;
              nodeDepth.set(currentScope, depth);
              ts.forEachChild(
                member.body,
                (n) => visit(n, currentScope, depth + 1),
              );
              currentScope = prevScope;
            }
          } // メソッドの処理
          else if (ts.isMethodDeclaration(member) && member.name) {
            let methodName = `${className}.`;

            if (ts.isIdentifier(member.name)) {
              methodName += member.name.text;
            } else {
              methodName += "<computed>";
            }

            const docComment = getDocComment(member);
            const typeString = getNodeTypeString(member);

            // 静的メソッドかどうかを判定
            const modifiers = ts.canHaveModifiers(member)
              ? ts.getModifiers(member)
              : undefined;
            const isStatic = modifiers?.some((m) =>
              m.kind === ts.SyntaxKind.StaticKeyword
            ) ?? false;

            callGraph.addNode(methodName, {
              kind: "method",
              type: typeString,
              docComment,
              sourceFile: sourceFile.fileName,
              isStatic,
              parentClass: className,
            });

            // メソッド本体を処理
            if (member.body) {
              const prevScope = currentScope;
              currentScope = methodName;
              nodeDepth.set(currentScope, depth);
              ts.forEachChild(
                member.body,
                (n) => visit(n, currentScope, depth + 1),
              );
              currentScope = prevScope;
            }
          } // プロパティの処理
          else if (ts.isPropertyDeclaration(member) && member.name) {
            let propertyName = `${className}.`;

            if (ts.isIdentifier(member.name)) {
              propertyName += member.name.text;
            } else {
              propertyName += "<computed>";
            }

            const docComment = getDocComment(member);
            const typeString = getNodeTypeString(member);

            // 静的プロパティかどうかを判定
            const modifiers = ts.canHaveModifiers(member)
              ? ts.getModifiers(member)
              : undefined;
            const isStatic = modifiers?.some((m) =>
              m.kind === ts.SyntaxKind.StaticKeyword
            ) ?? false;

            callGraph.addNode(propertyName, {
              kind: "property",
              type: typeString,
              docComment,
              sourceFile: sourceFile.fileName,
              isStatic,
              parentClass: className,
            });

            // 初期化式があれば処理
            if (member.initializer) {
              const prevScope = currentScope;
              currentScope = propertyName;
              nodeDepth.set(currentScope, depth);
              visit(member.initializer, currentScope, depth + 1);
              currentScope = prevScope;
            }
          }
        }
      }

      // 関数宣言、関数式、アロー関数などを検出
      if (
        ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node)
      ) {
        // 関数名の取得
        let functionName: string;
        let isExported = false;

        if (ts.isFunctionDeclaration(node)) {
          if (node.name) {
            functionName = node.name.text;
            isExported = isNodeExported(node);
          } else {
            // 無名関数の場合は位置情報を名前にする
            const { line, character } = sourceFile
              .getLineAndCharacterOfPosition(node.getStart());
            functionName = `anonymous_${
              sourceFile.fileName.split("/").pop()
            }_${line}_${character}`;
          }
        } else if (ts.isFunctionExpression(node) && node.name) {
          functionName = node.name.text;
        } else {
          // 無名関数の場合は位置情報を名前にする
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(
            node.getStart(),
          );
          functionName = `anonymous_${
            sourceFile.fileName.split("/").pop()
          }_${line}_${character}`;
        }

        // 型情報を取得
        const typeString = getNodeTypeString(node);
        const docComment = getDocComment(node);

        // ノード情報を追加
        callGraph.addNode(functionName, {
          kind: "function",
          type: typeString,
          isExported,
          docComment,
          sourceFile: sourceFile.fileName,
        });

        // 関数スコープを更新して子ノードを巡回
        const prevScope = currentScope;
        currentScope = functionName;
        nodeDepth.set(currentScope, depth);

        // 再帰呼び出しの制限
        const nodePath = `${sourceFile.fileName}:${functionName}`;
        if (!visitedNodes.has(nodePath)) {
          visitedNodes.add(nodePath);

          if (node.body) {
            ts.forEachChild(
              node.body,
              (n) => visit(n, currentScope, depth + 1),
            );
          }

          visitedNodes.delete(nodePath);
        }

        currentScope = prevScope;
        return;
      }

      // 現在のスコープがない場合はグローバルスコープとして扱う
      if (!currentScope) {
        currentScope = `<global>_${sourceFile.fileName.split("/").pop()}`;
        nodeDepth.set(currentScope, 0);
        callGraph.addNode(currentScope, {
          kind: "global",
          sourceFile: sourceFile.fileName,
        });
      }

      // 関数呼び出しを検出
      if (ts.isCallExpression(node)) {
        let calleeName: string;
        let isMethod = false;
        let isConstructor = false;
        let isStatic = false;
        let isPropertyAccess = false;
        let className: string | undefined;
        let instanceType: string | undefined;

        // 呼び出される関数の名前を取得
        const expr = node.expression;

        if (ts.isIdentifier(expr)) {
          calleeName = expr.text;
        } else if (
          ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.name)
        ) {
          // obj.method() または obj.property のような呼び出し
          calleeName = expr.name.text;

          // 可能ならオブジェクト名も追加
          if (ts.isIdentifier(expr.expression)) {
            className = expr.expression.text;

            // インスタンス変数の型情報を取得
            try {
              const type = typeChecker.getTypeAtLocation(expr.expression);
              instanceType = typeChecker.typeToString(type);
            } catch (e) {
              // 型情報の取得に失敗した場合は無視
            }
            calleeName = `${className}.${calleeName}`;

            // クラスのメソッドかプロパティかを判定
            const classNode = callGraph.getNode(className);
            if (classNode && classNode.kind === "class") {
              isMethod = true;

              // 静的メソッドかどうかを判定
              const methodNode = callGraph.getNode(calleeName);
              if (methodNode) {
                isStatic = methodNode.isStatic ?? false;
              }
            } else {
              // クラスノードが存在しない場合、インスタンス変数の型情報を使用
              if (instanceType) {
                // インスタンス変数の型情報からクラス名を抽出
                // 例: "BaseClass", "DerivedClass", "AnonymousClass" など
                const typeMatch = instanceType.match(
                  /^([A-Za-z_][A-Za-z0-9_]*)/,
                );
                if (typeMatch) {
                  const actualClassName = typeMatch[1];

                  // クラスノードが存在するか確認
                  const actualClassNode = callGraph.getNode(actualClassName);
                  if (actualClassNode && actualClassNode.kind === "class") {
                    // メソッド名を取得
                    const methodName = calleeName.split(".")[1];

                    // クラスメソッドのノード名を更新
                    const actualMethodName = `${actualClassName}.${methodName}`;

                    // メソッドノードが存在するか確認
                    const methodNode = callGraph.getNode(actualMethodName);
                    if (methodNode) {
                      // 既存のメソッドノードが見つかった場合
                      calleeName = actualMethodName;
                      isMethod = true;
                      isStatic = methodNode.isStatic ?? false;
                    } else {
                      // メソッドノードが見つからない場合、継承関係をチェック
                      let currentClass = actualClassNode;
                      let foundInherited = false;

                      // 継承チェーンをたどる
                      while (currentClass.superClass) {
                        const superClassName = currentClass.superClass;
                        const superMethodName =
                          `${superClassName}.${methodName}`;
                        const superMethodNode = callGraph.getNode(
                          superMethodName,
                        );

                        if (superMethodNode) {
                          // 親クラスのメソッドが見つかった場合
                          calleeName = superMethodName;
                          isMethod = true;
                          isStatic = superMethodNode.isStatic ?? false;
                          foundInherited = true;
                          break;
                        }

                        // 次の親クラスへ
                        currentClass = callGraph.getNode(
                          superClassName,
                        ) as NodeInfo;
                        if (!currentClass || currentClass.kind !== "class") {
                          break;
                        }
                      }

                      // 継承チェーンでも見つからなかった場合はプロパティアクセスとして扱う
                      if (!foundInherited) {
                        isPropertyAccess = true;
                      }
                    }
                  }
                }
              }
            }
          }
        } else if (ts.isNewExpression(expr)) {
          // new Class() のようなコンストラクタ呼び出し
          isConstructor = true;

          if (ts.isIdentifier(expr.expression)) {
            calleeName = expr.expression.text;
            className = calleeName;
          } else {
            const { line, character } = sourceFile
              .getLineAndCharacterOfPosition(expr.getStart());
            calleeName = `<constructor>_${line}_${character}`;
          }
        } else {
          // 複雑な呼び出しの場合
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(
            expr.getStart(),
          );
          calleeName = `<complex>_${line}_${character}`;
        }

        // 呼び出し情報の準備
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(
          node.getStart(),
        );
        const calleeType = getNodeTypeString(expr);
        const callerType = currentScope
          ? callGraph.getNode(currentScope)?.type
          : undefined;

        // 呼び出し情報をグラフに追加
        callGraph.addCall(
          currentScope,
          calleeName,
          sourceFile.fileName,
          line + 1,
          character + 1,
          {
            isMethod,
            isConstructor,
            className,
            isStatic,
            isPropertyAccess,
            callerType: callerType as string | undefined,
            calleeType,
          },
        );
      }

      // 子ノードを再帰的に巡回
      ts.forEachChild(node, (n) => visit(n, currentScope, depth + 1));
    }

    // ファイルのルートから巡回を開始
    visit(sourceFile, undefined);
  }

  return callGraph;
}
