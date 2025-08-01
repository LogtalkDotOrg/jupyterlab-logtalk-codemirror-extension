
import { JupyterFrontEnd, JupyterFrontEndPlugin} from '@jupyterlab/application';
import { IEditorLanguageRegistry} from '@jupyterlab/codemirror';
import { ICommandPalette } from '@jupyterlab/apputils';
import { ILauncher } from '@jupyterlab/launcher';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { LabIcon } from '@jupyterlab/ui-components';
import { StreamLanguage, StreamParser, LanguageSupport } from '@codemirror/language';

// Comprehensive Logtalk stream parser for CodeMirror 6
// Based on the official Logtalk language support from LogtalkDotOrg/logtalk3
const logtalkStreamParser: StreamParser<any> = {
  startState() {
    return {
      inComment: false,
      inString: false,
      stringDelim: null,
      stringType: null  // 'atom' for quoted atoms, 'string' for double-quoted terms
    };
  },

  token(stream, state) {
    // Handle block comments
    if (state.inComment) {
      if (stream.match(/\*\//)) {
        state.inComment = false;
        return "comment";
      }
      stream.next();
      return "comment";
    }

    // Handle strings and quoted atoms
    if (state.inString) {
      if (stream.match(state.stringDelim)) {
        state.inString = false;
        const returnType = state.stringType === 'atom' ? 'atom' : 'string';
        state.stringDelim = null;
        state.stringType = null;
        return returnType;
      }

      // Control character escape sequences
      if (stream.match(/\\[abfnrtv\\'"]/)) {
        // Standard escape sequences: \a \b \f \n \r \t \v \\ \' \"
        return "string.escape";
      }
      if (stream.match(/\\[0-7]+\\/)) {
        // Octal escape sequences: \123\
        return "string.escape";
      }
      if (stream.match(/\\x[0-9a-fA-F]+\\/)) {
        // Hexadecimal escape sequences: \x1F\
        return "string.escape";
      }
      if (stream.match(/\\u[0-9a-fA-F]{4}/)) {
        // Unicode escape sequences: \u1234
        return "string.escape";
      }
      if (stream.match(/\\U[0-9a-fA-F]{8}/)) {
        // Extended Unicode escape sequences: \U12345678
        return "string.escape";
      }
      if (stream.match(/\\\s/)) {
        // Line continuation (backslash followed by whitespace)
        return "string.escape";
      }

      stream.next();
      return state.stringType === 'atom' ? 'atom' : 'string';
    }

    // Start of block comment
    if (stream.match(/\/\*/)) {
      state.inComment = true;
      return "comment";
    }

    // Line comment
    if (stream.match(/%.*$/)) {
      return "comment";
    }

    // Quoted atom
    if (stream.match(/'/)) {
      state.inString = true;
      state.stringDelim = "'";
      state.stringType = 'atom';
      return "atom";
    }

    // Double-quoted term
    if (stream.match(/"/)) {
      state.inString = true;
      state.stringDelim = '"';
      state.stringType = 'string';
      return "string";
    }

    // Entity opening directives
    if (stream.match(/:-\s(?:object|protocol|category|module)(?=\()/)) {
      return "meta";
    }

    // End entity directives
    if (stream.match(/:-\send_(?:object|protocol|category)(?=\.)/)) {
      return "meta";
    }

    // Entity relations
    if (stream.match(/\b(?:complements|extends|instantiates|imports|implements|specializes)(?=\()/)) {
      return "meta";
    }

    // Other directives
    if (stream.match(/:-\s(?:else|endif|built_in|dynamic|synchronized|threaded)(?=\.)/)) {
      return "meta";
    }
    if (stream.match(/:-\s(?:calls|coinductive|elif|encoding|ensure_loaded|export|if|include|initialization|info|reexport|set_(?:logtalk|prolog)_flag|uses)(?=\()/)) {
      return "meta";
    }
    if (stream.match(/:-\s(?:alias|info|dynamic|discontiguous|meta_(?:non_terminal|predicate)|mode|multifile|public|protected|private|op|uses|use_module|synchronized)(?=\()/)) {
      return "meta";
    }

    // Message sending operator
    if (stream.match(/::/)) {
      return "operator";
    }

    // Explicit module qualification
    if (stream.match(/:/)) {
      return "operator";
    }

    // External call operators
    if (stream.match(/[{}]/)) {
      return "operator";
    }

    // Mode operators
    if (stream.match(/[?@]/)) {
      return "operator";
    }

    // Comparison operators
    if (stream.match(/@(?:=<|<|>|>=)|==|\\==/)) {
      return "operator";
    }
    if (stream.match(/=<|[<>]=?|=:=|=\\=/)) {
      return "operator";
    }

    // Bitwise operators
    if (stream.match(/<<|>>|\/\\|\\\/|\\/)) {
      return "operator";
    }

    // Arithmetic operators
    if (stream.match(/\*\*|[+\-*\/]|\/\//)) {
      return "operator";
    }

    // Evaluable functions
    if (stream.match(/\b(?:e|pi|div|mod|rem)\b(?![_!(^~])/)) {
      return "operator";
    }

    // Misc operators
    if (stream.match(/:-|!|\\+|[,;]|-->|->|=|\\=|\.|\.\.|\^|\bas\b|\bis\b/)) {
      return "operator";
    }

    // Built-in predicates - evaluable functions
    if (stream.match(/\b(?:abs|acos|asin|atan|atan2|ceiling|cos|div|exp|float(?:_(?:integer|fractional)_part)?|floor|log|max|min|mod|rem|round|sign|sin|sqrt|tan|truncate|xor)(?=\()/)) {
      return "builtin";
    }

    // Control predicates
    if (stream.match(/\b(?:true|fail|false|repeat|(?:instantiation|system)_error)\b(?![_!(^~])/)) {
      return "builtin";
    }
    if (stream.match(/\b(?:uninstantiation|type|domain|consistency|existence|permission|representation|evaluation|resource|syntax)_error(?=\()/)) {
      return "builtin";
    }
    if (stream.match(/\b(?:call|catch|ignore|throw|once)(?=\()/)) {
      return "builtin";
    }

    // Event handlers
    if (stream.match(/\b(after|before)(?=\()/)) {
      return "builtin";
    }
    
    // Message forwarding handler
    if (stream.match(/\bforward(?=\()/)) {
      return "builtin";
    }
    // Execution-context methods
    if (stream.match(/\b(context|parameter|this|se(lf|nder))(?=\()/)) {
      return "builtin";
    }
    // Reflection
    if (stream.match(/\b(current_predicate|predicate_property)(?=\()/)) {
      return "builtin";
    }
    // DCGs and term expansion
    if (stream.match(/\b(expand_(goal|term)|(goal|term)_expansion|phrase)(?=\()/)) {
      return "builtin";
    }

    // Entity creation and destruction
    if (stream.match(/\b(abolish|c(reate|urrent))_(object|protocol|category)(?=\()/)) {
      return "builtin";
    }

    // Entity properties
    if (stream.match(/\b(object|protocol|category)_property(?=\()/)) {
      return "builtin";
    }

    // Entity relations
    if (stream.match(/\bco(mplements_object|nforms_to_protocol)(?=\()/)) {
      return "builtin";
    }
    if (stream.match(/\bextends_(object|protocol|category)(?=\()/)) {
      return "builtin";
    }
    if (stream.match(/\bimp(lements_protocol|orts_category)(?=\()/)) {
      return "builtin";
    }
    if (stream.match(/\b(instantiat|specializ)es_class(?=\()/)) {
      return "builtin";
    }

    // Events
    if (stream.match(/\b(current_event|(abolish|define)_events)(?=\()/)) {
      return "builtin";
    }

    // Flags
    if (stream.match(/\b(create|current|set)_logtalk_flag(?=\()/)) {
      return "builtin";
    }

    // Compiling, loading, and library paths
    if (stream.match(/\blogtalk_(compile|l(ibrary_path|oad|oad_context)|make(_target_action)?)(?=\()/)) {
      return "builtin";
    }
    if (stream.match(/\blogtalk_make\b/)) {
      return "builtin";
    }

    // Database
    if (stream.match(/\b(clause|retract(all)?)(?=\()/)) {
      return "builtin";
    }
    if (stream.match(/\ba(bolish|ssert(a|z))(?=\()/)) {
      return "builtin";
    }

    // All solutions
    if (stream.match(/\b((bag|set)of|f(ind|or)all)(?=\()/)) {
      return "builtin";
    }

    // Multi-threading predicates
    if (stream.match(/\bthreaded(_(ca(ll|ncel)|once|ignore|exit|peek|wait|notify))?(?=\()/)) {
      return "builtin";
    }

    // Engine predicates
    if (stream.match(/\bthreaded_engine(_(create|destroy|self|next|next_reified|yield|post|fetch))?(?=\()/)) {
      return "builtin";
    }

    // Term unification
    if (stream.match(/\b(subsumes_term|unify_with_occurs_check)(?=\()/)) {
      return "builtin";
    }

    // Term creation and decomposition
    if (stream.match(/\b(functor|arg|copy_term|numbervars|term_variables)(?=\()/)) {
      return "builtin";
    }

    // Stream selection and control
    if (stream.match(/\b(curren|se)t_(in|out)put(?=\()/)) {
      return "builtin";
    }
    if (stream.match(/\b(open|close)(?=[(])(?=\()/)) {
      return "builtin";
    }
    if (stream.match(/\bflush_output(?=[(])(?=\()/)) {
      return "builtin";
    }
    if (stream.match(/\b(at_end_of_stream|flush_output)\b/)) {
      return "builtin";
    }
    if (stream.match(/\b(stream_property|at_end_of_stream|set_stream_position)(?=\()/)) {
      return "builtin";
    }

    // Character and byte input/output
    if (stream.match(/\b(?:(?:get|peek|put)_(?:char|code|byte)|nl)(?=\()/)) {
      return "builtin";
    }
    if (stream.match(/\bnl\b/)) {
      return "builtin";
    }

    // Term input/output
    if (stream.match(/\bread(_term)?(?=\()/)) {
      return "builtin";
    }
    if (stream.match(/\bwrite(q|_(canonical|term))?(?=\()/)) {
      return "builtin";
    }
      if (stream.match(/\b(current_)?op(?=\()/)) {
      return "builtin";
    }
    if (stream.match(/\b(current_)?char_conversion(?=\()/)) {
      return "builtin";
    }

    // Atom/term processing
    if (stream.match(/\b(?:atom_(?:length|chars|concat|codes)|sub_atom|char_code|number_(?:char|code)s)(?=\()/)) {
      return "builtin";
    }

    // Term testing
    if (stream.match(/\b(?:var|atom(ic)?|integer|float|callable|compound|nonvar|number|ground|acyclic_term)(?=\()/)) {
      return "builtin";
    }

    // Term comparison
    if (stream.match(/\bcompare(?=\()/)) {
      return "builtin";
    }

    // Sorting
    if (stream.match(/\b(key)?sort(?=\()/)) {
      return "builtin";
    }

    // Implementation defined hooks functions
    if (stream.match(/\b(se|curren)t_prolog_flag(?=\()/)) {
      return "builtin";
    }
    if (stream.match(/\bhalt\b/)) {
      return "builtin";
    }
    if (stream.match(/\bhalt(?=\()/)) {
      return "builtin";
    }

    // Numbers
    if (stream.match(/\b(?:0b[01]+|0o[0-7]+|0x[0-9a-fA-F]+)\b/)) {
      return "number";
    }
    if (stream.match(/(?<=^|\s)0'(?:\\.|.)/)) {
      return "number";
    }
    if (stream.match(/\b\d+\.?\d*(?:[eE][+-]?\d+)?\b/)) {
      return "number";
    }

    // Variables
    if (stream.match(/\b[A-Z_][A-Za-z0-9_]*\b/)) {
      return "variable";
    }

    // Skip atoms that aren't keywords or builtins
    if (stream.match(/\b[a-z][A-Za-z0-9_]*\b/)) {
      return null;
    }

    // Skip whitespace
    if (stream.match(/\s+/)) {
      return null;
    }

    // Default: consume one character
    stream.next();
    return null;
  }
};

// Create the Logtalk language definition for JupyterLab 4
const logtalkLanguage = {
  name: 'logtalk',
  displayName: 'Logtalk',
  mime: ['text/x-logtalk'],
  extensions: ['lgt', 'logtalk'],
  load: async (): Promise<LanguageSupport> => {
    const streamLanguage = StreamLanguage.define(logtalkStreamParser);
    return new LanguageSupport(streamLanguage, [
      streamLanguage.data.of({
        commentTokens: { line: "%", block: { open: "/*", close: "*/" } },
        closeBrackets: { brackets: ["(", "[", "{", "'", '"'] },
        indentOnInput: /^\s*(?::-\s(?:object|protocol|category|module)\(.*|:-\send_(?:object|protocol|category)\.|:-|\.)/,
        indentService: (context, pos) => {
          const line = context.state.doc.lineAt(pos);
          const lineText = line.text;

          // If this is the first line, no indentation
          if (line.number === 1) {
            return 0;
          }

          // Get the previous non-empty line
          let prevLineNumber = line.number - 1;
          let prevLine = null;
          let prevLineText = '';

          while (prevLineNumber >= 1) {
            prevLine = context.state.doc.line(prevLineNumber);
            prevLineText = prevLine.text.trim();
            if (prevLineText) break;
            prevLineNumber--;
          }

          // If no previous line found, return 0
          if (!prevLineText || !prevLine) {
            return 0;
          }

          // Calculate current indentation of previous line
          const prevIndentMatch = prevLine.text.match(/^(\s*)/);
          const prevIndent = prevIndentMatch ? prevIndentMatch[1].length : 0;
          const indentSize = 4;

          // Current line patterns (de-indent these)
          if (/^\s*:-\send_(?:object|protocol|category)\./.test(lineText)) {
            // De-indent entity closing directives
            return Math.max(0, prevIndent - indentSize);
          }

          if (/^\s*\.(?:\s|$)/.test(lineText)) {
            // De-indent lines that start with period (clause termination)
            return Math.max(0, prevIndent - indentSize);
          }

          // Previous line patterns (indent after these)
          // Indent after entity opening directives
          if (/:-\s(?:object|protocol|category|module)\(.*/.test(prevLineText)) {
            return prevIndent + indentSize;
          }

          // Indent after clause neck operator
          if (/:-/.test(prevLineText) || /:-(?![^(]*\)).*[^.]$/.test(prevLineText)) {
            return prevIndent + indentSize;
          }

          // Indent after opening parentheses, brackets, or braces at end of line
          if (/[(\[{]\s*$/.test(prevLineText)) {
            return prevIndent + indentSize;
          }

          // De-indent after closing parentheses, brackets, or braces at start of current line
          if (/^\s*[)\]}]/.test(lineText)) {
            return Math.max(0, prevIndent - indentSize);
          }

          // Default: maintain previous line's indentation
          return prevIndent;
        }
      })
    ]);
  }
};

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab_logtalk_codemirror_extension:plugin',
  description: 'A JupyterLab extension for Logtalk syntax highlighting.',
  autoStart: true,
  requires: [IEditorLanguageRegistry, ILauncher, IFileBrowserFactory, ICommandPalette],
  activate: (
    app: JupyterFrontEnd,
    languages: IEditorLanguageRegistry,
    launcher: ILauncher,
    browserFactory: IFileBrowserFactory,
    palette: ICommandPalette
  ) => {
    // Register the Logtalk language
    languages.addLanguage(logtalkLanguage);
    // Add a launcher item for Logtalk files
    const { commands } = app;
    const commandID = 'logtalk:create-file';    
    const logtalkTextIcon = new LabIcon({
      name: 'logtalk-text-icon',
      svgstr: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <text x="12" y="20" font-family="monospace" font-size="24" text-anchor="middle" fill="CanvasText">⊨</text>
      </svg>`
    });
    commands.addCommand(commandID, {
      label: args =>
        args['isPalette']
          ? 'New Logtalk File'
          : 'Logtalk File',
      caption: 'Create a new Logtalk file',
      icon: logtalkTextIcon,
      execute: async () => {
        const model = await commands.execute('docmanager:new-untitled', {
          path: browserFactory.tracker.currentWidget?.model.path,
          type: 'file',
          ext: 'lgt'
        });
        return commands.execute('docmanager:open', {
          path: model.path,
          factory: 'Editor'
        });
      }
    });
    launcher.add({
      command: commandID,
      category: 'Other',
      rank: 1
    });
    palette.addItem({
      command: commandID,
      args: { isPalette: true },
      category: 'Other'
    });

    console.log('JupyterLab extension jupyterlab_logtalk_codemirror_extension is activated!');
  }
};

export default plugin;
