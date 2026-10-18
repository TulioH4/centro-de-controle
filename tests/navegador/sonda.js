window.__erros = [];
window.addEventListener('error', e => __erros.push('error: ' + e.message + ' @' + (e.lineno || '')));
window.addEventListener('unhandledrejection', e => __erros.push('rejection: ' + (e.reason && e.reason.message || e.reason)));
const _ce = console.error; console.error = (...a) => { __erros.push('console: ' + a.map(String).join(' ')); _ce.apply(console, a); };
document.addEventListener('securitypolicyviolation', e => __erros.push('csp: ' + e.violatedDirective + ' ' + e.blockedURI + ' ' + (e.sourceFile || '') + ':' + (e.lineNumber || '')));
