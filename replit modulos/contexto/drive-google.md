---
name: Google Drive
description: Estado e operação da sincronização de fotos dos prestadores com o Google Drive.
---

## Estado atual

A tela de Administração da recepção permite salvar o link da pasta, atualizar o status de configuração e iniciar uma sincronização manual. O servidor também agenda uma tentativa automática a cada 10 minutos.

## Configuração

No PC-servidor, configure as variáveis no ambiente do serviço (arquivo `.env`
protegido, systemd ou gerenciador equivalente), sem registrar os valores nesta
pasta:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_DRIVE_REFRESH_TOKEN`
- `GOOGLE_DRIVE_REDIRECT_URI` (opcional)
- `SESSION_SECRET` (necessário para proteger configurações armazenadas)

Depois, informe na tela o link `https://drive.google.com/drive/folders/...` e use **Atualizar status**. O botão **Sincronizar agora** só fica disponível quando a pasta e o OAuth estão completos.

## Próximo passo

Para usar a integração, criar no Google Cloud um cliente OAuth 2.0 com escopo de gravação no Drive, gerar o refresh token e cadastrá-lo no Secret correspondente. Não colocar credenciais ou tokens em documentação, código ou commits.