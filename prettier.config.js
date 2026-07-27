// Formato de codigo. Se usa un .js en vez de un .json para poder documentar por que
// se eligio cada opcion: el formato no se discute en cada revision, se decide aqui.
//
// Prettier NO comprueba correccion, solo forma. Las reglas de fondo las pone oxlint
// (ver .oxlintrc.json). No hace falta desactivar reglas de formato en el linter
// porque oxlint no trae ninguna activada, asi que los dos no se pisan.
export default {
  // Sin punto y coma: es el estilo con el que vino el scaffold de Vite y el que ya
  // usan src/App.tsx y src/main.tsx. Cambiarlo ahora solo generaria ruido en el diff.
  semi: false,

  // Comillas simples, por la misma razon de coherencia con el codigo existente.
  singleQuote: true,

  // 100 en vez de los 80 por defecto. El nucleo de simulacion tiene nombres largos
  // y descriptivos (guildElapsedMs, noUncheckedIndexedAccess...) que a 80 columnas
  // se parten en cascadas ilegibles. Subirlo mas dificultaria las revisiones a dos
  // columnas; bajarlo trocearia expresiones que se leen mejor de una pieza.
  printWidth: 100,

  // Coma final en todo lo que la admita: hace que anadir una linea sea un diff de
  // una linea y no de dos. Es el valor por defecto de Prettier 3, explicito aqui.
  trailingComma: 'all',
}
