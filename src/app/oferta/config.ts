// Tudo o que muda de uma oferta para outra fica aqui: textos, preços, links e imagens.
// Edite este arquivo e a landing page (/oferta) se ajusta sozinha.

export const oferta = {
  produto: "Resina Extreme",
  chamada: "Brilho de carro novo",
  subtitulo: "Seu carro com brilho de carro novo, feito por você em casa.",
  descricao:
    "Resina de brilho que realça a cor e deixa a pintura com efeito espelho — sem polidora e sem pagar estética automotiva.",
  vendidos: "Mais de 40 mil unidades vendidas",

  kit: "Kit com 2 Resinas Extreme 500 ml",
  precoDe: "R$ 179,98",
  precoPor: "R$ 137,90",
  // Parcelamento exibido abaixo do preço (deixe "" para esconder)
  parcelas: "",

  // Link do checkout / formulário de pedido. Vazio = o botão "Quero o meu" abre o WhatsApp.
  linkPedido: "",
  // Número com DDI + DDD, só dígitos. Ex.: "5511912345678". Vazio = botões de WhatsApp levam às dúvidas.
  whatsapp: "",
  mensagemWhatsapp: "Olá! Quero saber mais sobre o kit Resina Extreme com pagamento na entrega.",

  // Fotos reais (coloque os arquivos em public/lp/ e informe o caminho, ex.: "/lp/antes.jpg").
  // Vazio = usa as ilustrações que já vêm com a página.
  fotos: {
    produto: "",
    antes: "",
    depois: "",
  },
  // Prints reais de clientes no WhatsApp, ex.: ["/lp/prova1.jpg", "/lp/prova2.jpg"].
  // Use apenas conversas verdadeiras e com autorização do cliente.
  provas: [] as string[],

  rodape: "Este site não é afiliado ao Facebook ou à Meta.",
};

export const avisos = ["⭐ Mais de 40 mil vendidos", "💳 Pague somente na entrega", "🚚 Frete grátis"];

export const beneficios = [
  { icone: "✨", titulo: "Efeito espelho", texto: "Realça o brilho e a cor da pintura na hora." },
  { icone: "🛡️", titulo: "Camada protetora", texto: "Ajuda a proteger a pintura no dia a dia." },
  { icone: "🧽", titulo: "Fácil de aplicar", texto: "Só um pano de microfibra. Sem máquina." },
  { icone: "💰", titulo: "Economia", texto: "Resultado de estética sem pagar estética." },
];

export const pagamento = [
  { titulo: "Faça o pedido", texto: "Toque em “Quero o meu” e informe nome e endereço. Sem cartão e sem pagar nada agora." },
  { titulo: "Escolha o dia", texto: "Selecione o melhor dia de entrega disponível para a sua região." },
  { titulo: "Pague ao receber", texto: "Você paga direto ao entregador, na porta da sua casa." },
];

export const aplicacao = [
  { titulo: "Lave e seque", texto: "Lave e seque o carro na sombra, com a pintura fria." },
  { titulo: "Espalhe", texto: "Aplique com microfibra, em pequenas áreas, com movimentos circulares." },
  { titulo: "Dê o acabamento", texto: "Finalize com um pano seco para puxar o brilho." },
];

export const perguntas = [
  { p: "Preciso pagar alguma coisa agora?", r: "Não. Você só paga na entrega, direto ao entregador." },
  { p: "Tem frete?", r: `O frete é grátis. Você paga apenas ${oferta.precoPor} quando o produto chegar.` },
  { p: "Como escolho o dia da entrega?", r: "Depois de preencher seus dados, é só escolher um dos dias disponíveis para a sua região." },
  { p: "Quantas resinas vêm no kit?", r: "São 2 frascos de 500 ml — dá para dois carros ou para ter uma reserva." },
  { p: "E se eu não estiver em casa?", r: "Agende um dia em que você ou alguém de confiança possa receber e pagar." },
  { p: "Ainda tenho dúvidas. Como falo com vocês?", r: "Toque no botão verde do WhatsApp e fale com a nossa equipe." },
];
