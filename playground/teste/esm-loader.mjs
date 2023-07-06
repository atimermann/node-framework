import generateAliasesResolver from 'esm-module-alias'

const aliases = {
  '~': 'src'
}
export const resolve = generateAliasesResolver(aliases)
