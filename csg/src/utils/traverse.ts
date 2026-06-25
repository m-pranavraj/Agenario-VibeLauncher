import _traverse from '@babel/traverse';

const traverse: typeof import('@babel/traverse').default =
  typeof _traverse === 'function' ? _traverse : (_traverse as any).default;

export default traverse;
