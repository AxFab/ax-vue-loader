const jshint = require('jshint').JSHINT

function CompileVue(source) {
  const options = this.getOptions();
  const jshintPredef = options?.jshint?.predef || []
  const jshintOpts = options?.jshint || { undef: true, esversion: 11 }
  let script = null;
  let template = '';

  let end = 0, sz = 0;
  let onTemplate = false;

  const tagStack = [];
  const autoClosed = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr', 'command', 'keygen', 'menuitem', 'frame', ];
  // console.log('The request path', this.resourcePath);
  while (source.length > 0) {
    sz = 1;
    end = -1;
    var spaces = source.match(/^\s+/)
    if (spaces) {
      source = source.substr(spaces[0].length);
      if (template != '')
        template += ' ';
    }
    if (source.length == 0)
      break;

    if (/^<!\[CDATA\[/.test(source)) {
      end = source.indexOf(']]>')
      sz = 3;
      // console.log('Removed CDATA')
    } else if (/^<!--/.test(source)) {
      end = source.indexOf('-->') + 3;
      sz = 3;
      // console.log('Removed COMMENT')
    } else if (/^<!/.test(source)) {
      end = source.indexOf('>')
      // console.log('Removed PREPROC')
    } else if (/^<\?/.test(source)) {
      end = source.indexOf('>')
      // console.log('Removed GLOBAL')
    } else if (/^</.test(source)) {
      end = source.indexOf('>')
      const tagMatch = source.match(/^<(\/)?([a-z0-9]+)(\s+([a-z@.:_-]+)\s*=\s*("[^"]+"|'[^']+'))*\s*(\/)?>/i)
      const tag = source.substr(0, end + sz)
      if (tagMatch == null)
        this.emitWarning(new Error(`Malformed HTML tag: ${tag}`));
      else if (tagMatch[0].length - 1 > end) {
        // console.log('Close mismatch', tagMatch[0], end, tagMatch[0].length)
        end = tagMatch[0].length - 1;
      }

      if (tag.toLowerCase() == '<script>') {
        end = source.toLowerCase().indexOf('</script>') // SLOW!?
        sz = 10
        script = source.substr(8, end - 8)
        jshint(script.split('\n'), jshintOpts, {
          document:true, window:true, console: true, ...jshintPredef
        });
        for (var i in jshint.data().errors) {
          var err = jshint.data().errors[i];
          this.emitWarning(new Error(err.raw.replace(/\{([a-z])\}/g, (x,r) => err[r]) +
            ` at line ${err.line}: ${err.evidence.replace(/^\s+|\s+$/g, '')}`));
        }
        // console.log(jshint.data().errors);

      } else if (tag.toLowerCase() == '<template>') {
        onTemplate = true;
      } else if (tag.toLowerCase() == '</template>') {
        onTemplate = false;
      } else if (onTemplate) {
        if (tagMatch != null) {
          var ending = tagMatch[1] != null;
          var closing = tagMatch[6] != null;
          var tagName = tagMatch[2];
          if (ending && tagStack.length == 0)
            this.emitWarning(new Error(`Unexpected closing tag: ${tag}`));
          else if (ending && tagStack[tagStack.length - 1].n != tagName)
            this.emitWarning(new Error(`Wrong closing tag: ${tag} ${tagStack[tagStack.length - 1].t}`));
          else if (!ending && !closing && autoClosed.indexOf(tagName) < 0)
            tagStack.push({ n:tagName, t: tag });
          else if (ending)
            tagStack.pop();
        }
        // console.log('TAG', tag)
        template += tag;
      } else {
        this.emitWarning(new Error(`Unexpected token: ${tag}`));
      }
    } else if (onTemplate) {
      end = source.indexOf('<')
      sz = 0
      let text = source.substr(0, end);
      let ending = text.match(/\s+$/);
      if (ending)
        text = text.substr(0, text.length - ending[0].length) + ' '
      template += text;
      // console.log('TEXT', text)
    } else {
      this.emitWarning(new Error(`Unexpected token at ${source}`));
      return 'ERROR !!';
    }

    if (end < 0)
      return 'ERROR !!';

    source = source.substr(end + sz);
  }

  if (tagStack.length != 0)
    this.emitWarning(new Error(`Unclosed tag ${tagStack[tagStack.length - 1].t}  +(${tagStack.length})`));

  // console.log('SCRIPT')
  script = script.replace(/export\s+default\s+{/, (x, m) => {
    return `${x}\n  template: '${template.replace(/\'/g, "\\'")}', `
  })
  return script;
}



module.exports = CompileVue
