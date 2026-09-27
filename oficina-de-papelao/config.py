# -*- coding: utf-8 -*-
"""
DADOS DO NEGÓCIO – preencha aqui e rode `python build_site.py` de novo.

Tudo que estiver como PENDENTE fica com um marcador seguro no site:
  - checkout PENDENTE: os botões levam para a seção de oferta (#oferta);
  - pixel PENDENTE: o código do pixel fica comentado, com instruções;
  - domínio PENDENTE: o og:image fica com endereço relativo (o Facebook
    só mostra a imagem de prévia quando o endereço é completo, com https://).
"""
PENDENTE = "PENDENTE"

NOME_PRODUTO = "Oficina de Papelão – 120 projetos"
PRECO = "9,90"                      # sem "R$"
LINK_CHECKOUT = PENDENTE            # ex.: "https://pay.kiwify.com.br/XXXXXXX"
PLATAFORMA = PENDENTE               # Kiwify / Hotmart / outra
PIXEL_ID = PENDENTE                 # só números, ex.: "123456789012345"
DOMINIO = PENDENTE                  # ex.: "oficinadepapelao.com.br" (sem https://)
EMAIL_SUPORTE = PENDENTE            # ex.: "contato@oficinadepapelao.com.br"
NOME_MARCA = "Oficina de Papelão"
WHATSAPP = PENDENTE                 # ex.: "5511999999999" (com DDI e DDD)

# Identificação de quem vende (Decreto 7.962/2013 – comércio eletrônico).
# Aparece no rodapé e nas páginas de privacidade e termos.
RESPONSAVEL = PENDENTE              # nome completo ou razão social
DOCUMENTO = PENDENTE                # CNPJ ou CPF


def pendente(valor):
    return not valor or valor.strip().upper() == PENDENTE
