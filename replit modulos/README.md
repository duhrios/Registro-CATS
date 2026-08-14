# Replit módulos

Esta pasta guarda somente documentação e modelos auxiliares relacionados ao
Replit para facilitar a continuidade do trabalho entre contas.

Ela é independente do aplicativo e não participa de nenhum workflow de
execução. Pode ser removida antes de publicar o app em um ambiente que não
precise dela.

## Estrutura

- `contexto/` — decisões e informações gerais para retomar o trabalho.
- `instancias-pmp/` — modelos de instâncias/planos de trabalho, sem dados
  sensíveis.
- `templates/` — modelos reutilizáveis para registros operacionais.

## Regras de segurança

- Nunca salvar senhas, tokens, chaves de API, cookies, URLs assinadas ou
  valores de secrets nesta pasta.
- Registrar apenas nomes de variáveis, instruções e referências não sensíveis.
- Dados específicos de uma conta devem ser descritos de forma genérica para
  que a outra conta possa reconfigurá-los com seus próprios secrets.
- Esta pasta não deve ser importada pelo código do app nem adicionada aos
  workflows de produção.