# Especificação - Document Management System

## 1. Objetivo

Permitir que um usuário de demonstração envie, liste e baixe documentos armazenados no filesystem local da aplicação, com metadados mantidos em memória.

## 2. Escopo

### Dentro do escopo

- Envio de documentos por `multipart/form-data`.
- Listagem dos documentos associados ao usuário de demonstração.
- Download de um documento pelo identificador.
- Validação do arquivo, dos limites de tamanho e dos formatos permitidos.
- Respostas HTTP previsíveis para sucesso e falhas esperadas.
- Interface React para upload, listagem e download.

### Fora do escopo

- Armazenamento externo ou em nuvem; os arquivos ficam no filesystem local.
- Banco de dados ou persistência durável dos metadados.
- Autenticação real, autorização multiusuário ou gestão de contas.
- Versionamento, exclusão, compartilhamento, busca ou edição de documentos.
- Antivírus ou análise de conteúdo dos arquivos.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O usuário pode enviar um único documento por requisição usando o campo `file` de um formulário `multipart/form-data`. |
| RF-02 | O sistema aceita arquivos PDF, DOCX ou TXT de até 10 MiB (10.485.760 bytes), inclusive. A extensão e o tipo MIME declarado devem corresponder a um formato permitido. |
| RF-03 | O sistema gera um identificador UUID para cada documento e um nome de armazenamento interno que não depende do nome original enviado pelo usuário. |
| RF-04 | Após um upload bem-sucedido, o sistema registra os metadados em memória e retorna os metadados públicos do documento. |
| RF-05 | O usuário pode listar os documentos do usuário de demonstração. A lista é ordenada do mais recente para o mais antigo; uma lista vazia é uma resposta bem-sucedida. |
| RF-06 | O usuário pode baixar um documento pelo identificador. A resposta é um anexo binário com o nome original apresentado de forma segura no cabeçalho de download. |
| RF-07 | Se o arquivo não for enviado, for inválido, exceder o limite ou não existir, o sistema retorna o erro HTTP e o código de erro especificados nesta seção de contratos. |
| RF-08 | Se a gravação falhar, o sistema não mantém metadados para um arquivo que não foi armazenado com sucesso; arquivos parciais devem ser removidos quando possível. |
| RF-09 | Os metadados e arquivos existentes não são reconstruídos após reinício do processo. Documentos cujo metadado não está em memória não aparecem na listagem e não podem ser baixados por ID. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | O backend grava os arquivos exclusivamente no filesystem local, usando `multer` com `diskStorage` e o diretório configurado para armazenamento (por padrão, `backend/storage`). |
| RNF-02 | Os metadados ficam em memória nesta fase; não adicionar banco de dados nem serviço de armazenamento externo. |
| RNF-03 | Configurações operacionais, incluindo porta, diretório de armazenamento, limite de upload e identificador do usuário de demonstração, são obtidas por variáveis de ambiente com defaults documentados. |
| RNF-04 | O nome original do arquivo não é usado como nome físico de armazenamento nem como caminho. Caminhos internos nunca são retornados pela API. |
| RNF-05 | A checagem de extensão e MIME é uma validação de entrada, não uma garantia de que o conteúdo do arquivo é seguro ou autêntico. |
| RNF-06 | Erros esperados usam códigos HTTP e códigos de erro estáveis; respostas de erro não expõem stack traces, caminhos locais ou detalhes internos. |
| RNF-07 | O backend usa Node.js, Express e CommonJS; os testes backend usam o runner nativo `node:test`. O frontend usa React, Vite e `fetch`. |

### Configuração inicial

| Variável | Default | Descrição |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP do backend. |
| `STORAGE_DIR` | `backend/storage` | Diretório local de armazenamento dos arquivos. |
| `MAX_FILE_SIZE` | `10485760` | Limite de upload em bytes (10 MiB). |
| `DEFAULT_OWNER_ID` | `demo-user` | Identificador fixo do usuário de demonstração. |

Os formatos aceitos são definidos pelo MVP como PDF (`.pdf`, `application/pdf`), DOCX (`.docx`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`) e TXT (`.txt`, `text/plain`). A allowlist deve ser aplicada no backend. Como o MIME informado pelo cliente pode ser falsificado, essa validação não substitui análise do conteúdo.

## 5. Modelo de dados (metadados do documento)

Os metadados são mantidos em memória pelo repositório durante a vida do processo. O modelo público retornado pela API é:

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string | UUID único do documento. |
| `originalName` | string | Nome original enviado pelo cliente, preservado para exibição e download; não é usado como caminho de armazenamento. |
| `size` | number | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Data e hora UTC do upload em formato ISO 8601. |
| `owner` | string | Identificador do usuário dono; no MVP é o valor de `DEFAULT_OWNER_ID`, não fornecido pelo cliente. |
| `contentType` | string | Tipo MIME associado ao formato permitido. |

O registro interno também contém `storageKey` (string), nome único gerado pelo servidor para localizar o arquivo dentro de `STORAGE_DIR`. Esse campo e qualquer caminho absoluto são internos e nunca fazem parte das respostas JSON. O nome físico deve ser gerado pelo servidor, preferencialmente com base no UUID e extensão validada.

## 6. Contratos de API

As rotas abaixo são caminhos do backend, sem prefixo `/api`. No desenvolvimento, o proxy do Vite permite ao frontend chamá-las por `/api/...` e remove esse prefixo antes de encaminhar a requisição ao backend.

### Formato padrão de erro

Respostas de erro usam `application/json` e o formato:

```json
{
  "error": {
    "code": "FILE_REQUIRED",
    "message": "Envie um arquivo no campo file."
  }
}
```

`code` é estável para tratamento pelo cliente; `message` é uma mensagem legível em português. Respostas não incluem stack trace nem caminhos locais.

### `POST /upload`

- **Content-Type:** `multipart/form-data`.
- **Campo obrigatório:** `file`, contendo um único arquivo.
- **Owner:** atribuído pelo servidor usando `DEFAULT_OWNER_ID`; não aceitar owner informado pelo cliente.
- **Sucesso:** `201 Created`, `application/json`.

```json
{
  "document": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "originalName": "relatorio.pdf",
    "size": 24576,
    "uploadedAt": "2026-10-28T12:00:00.000Z",
    "owner": "demo-user",
    "contentType": "application/pdf"
  }
}
```

| Status | Código | Quando |
| --- | --- | --- |
| `400` | `FILE_REQUIRED` | Campo `file` ausente. |
| `400` | `UNSUPPORTED_FILE_TYPE` | Extensão ou MIME fora da allowlist, ou combinação incompatível. |
| `400` | `INVALID_MULTIPART` | Requisição multipart inválida ou mais de um arquivo enviado. |
| `413` | `FILE_TOO_LARGE` | Arquivo maior que `MAX_FILE_SIZE`. |
| `500` | `STORAGE_ERROR` | Falha ao gravar o arquivo ou registrar os metadados. |

### `GET /documents`

- **Entrada:** sem parâmetros obrigatórios.
- **Comportamento:** retorna os documentos do `DEFAULT_OWNER_ID`, ordenados por `uploadedAt` decrescente. Não há paginação no MVP.
- **Sucesso:** `200 OK`, `application/json`; quando não há documentos, retornar `documents: []`.

```json
{
  "documents": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "originalName": "relatorio.pdf",
      "size": 24576,
      "uploadedAt": "2026-10-28T12:00:00.000Z",
      "owner": "demo-user",
      "contentType": "application/pdf"
    }
  ]
}
```

| Status | Código | Quando |
| --- | --- | --- |
| `200` | - | Listagem concluída, inclusive quando vazia. |
| `500` | `INTERNAL_ERROR` | Falha inesperada ao listar documentos. |

### `GET /documents/:id/download`

- **Entrada:** `id` UUID do documento no path.
- **Sucesso:** `200 OK`, corpo binário do arquivo, `Content-Type` igual ao MIME registrado e `Content-Disposition: attachment` com o nome original devidamente codificado. O tamanho pode ser informado em `Content-Length`.
- **Falha:** responder em JSON no formato padrão de erro.

| Status | Código | Quando |
| --- | --- | --- |
| `404` | `DOCUMENT_NOT_FOUND` | ID inexistente nos metadados em memória. |
| `404` | `FILE_NOT_FOUND` | Metadado existe, mas o arquivo correspondente não está no filesystem. |
| `500` | `STORAGE_ERROR` | Outra falha ao ler ou transmitir o arquivo. |

### Integração no desenvolvimento

O backend atende `/upload`, `/documents` e `/documents/:id/download` na porta `3000`. O Vite atende na porta `5173` e encaminha chamadas `/api/*` para o backend, removendo `/api`; assim, o frontend usa, por exemplo, `fetch('/api/documents')`.

## 7. Decisões arquiteturais

- O fluxo do backend respeita a Clean Architecture simples: `routes -> controllers -> services -> repositories`.
- `routes` registram os caminhos e compõem o middleware de upload com os controllers; `controllers` traduzem HTTP e validam a entrada básica; `services` aplicam regras de negócio; `repositories` mantêm metadados em memória e encapsulam o acesso aos arquivos locais.
- O middleware de upload usa `multer` com `diskStorage`; destino e limite vêm da configuração. A geração do nome físico é responsabilidade do servidor.
- O armazenamento é estritamente local em `backend/storage` por default. Nenhum provedor externo é usado.
- O identificador do owner é fixo/configurável para demonstração e não constitui autenticação ou fronteira de segurança.
- O frontend usa componentes React e um serviço baseado em `fetch`; durante desenvolvimento, as chamadas usam o proxy `/api` do Vite.
- Upload, registro de metadados e tratamento de falha devem manter arquivo e metadado coerentes; quando uma etapa posterior falhar, tentar remover o arquivo parcial.
- O contrato público não expõe `storageKey`, caminhos físicos nem detalhes da infraestrutura.

## 8. Plano de execução

As etapas abaixo descrevem trabalho futuro. Esta especificação não executa nem altera arquivos de backend ou frontend.

1. Definir e validar a configuração do backend, diretório local, limites e middleware `multer.diskStorage`.
2. Implementar o repositório em memória e as operações locais de gravação e leitura, incluindo geração de IDs e nomes físicos.
3. Implementar os serviços de upload, listagem e download com as regras e erros desta especificação.
4. Conectar controllers e rotas HTTP, padronizar respostas e cobrir os contratos com testes `node:test`.
5. Implementar no frontend React os fluxos de envio, listagem, apresentação de erros e download, usando o proxy `/api`.
6. Validar os fluxos integrados, limites e formatos aceitos, erros de arquivo ausente e inexistente e comportamento após reinício.