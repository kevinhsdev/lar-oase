// Ajuda de cada tela (botão ? no topo ou tecla ?). Para um módulo novo: acrescente { nome, serve, passos, dicas }.
'use strict';

const AJUDA = {
  inicio: {
    nome: 'Início',
    serve: 'Um resumo do lar hoje: quantas pessoas estão no lar, quem está hospitalizado, os próximos aniversários e quem chegou por último.',
    passos: [
      'Clique num número (por exemplo “Hospitalizados”) para ver a lista daquelas pessoas.',
      'Clique no nome de um residente para abrir a ficha dele.',
      'Use “Novo residente” para cadastrar alguém que acabou de chegar.',
    ],
    dicas: [
      'Aperte <kbd>/</kbd> em qualquer tela para buscar um residente pelo nome, apelido, quarto ou familiar.',
      'Se aparecer o aviso amarelo de cópia de segurança, peça para a administração conferir em Configurações › Cópias de segurança.',
    ],
  },
  residentes: {
    nome: 'Residentes',
    serve: 'A lista de todas as pessoas que moram (ou moraram) no lar, com quarto, idade, grau de dependência e o familiar responsável.',
    passos: [
      'Para cadastrar: clique em <b>Novo residente</b>. Só o nome é obrigatório; o resto pode ser completado depois.',
      'Para achar alguém: digite na busca (nome, apelido, quarto ou nome do familiar).',
      'Use os filtros: <b>Atuais</b> (no lar + hospitalizados), <b>No lar</b>, <b>Hospitalizados</b>, <b>Histórico</b> (quem saiu ou faleceu) e <b>Todos</b>.',
      'Os botões de quadradinhos e de linhas trocam entre ver em <b>cartões</b> ou em <b>lista</b> (o sistema lembra a sua escolha).',
      'Clique no telefone do responsável para ligar direto (no celular).',
    ],
    dicas: [
      'A etiqueta vermelha “Alergia” avisa que a pessoa tem alergia registrada: abra a ficha para ver qual.',
      '“Imprimir lista” imprime o que está na tela, do jeito que está filtrado.',
    ],
  },
  residente: {
    nome: 'Ficha do residente',
    serve: 'Tudo sobre uma pessoa: dados pessoais, saúde, quarto, familiares e o histórico de quem mexeu na ficha.',
    passos: [
      '<b>Editar ficha</b> abre todos os dados para alterar.',
      'Para mudar a <b>situação</b> (no lar, hospitalizado, saiu, faleceu), clique na opção no alto da ficha e informe a data. A ficha nunca some: quem saiu ou faleceu fica no filtro Histórico.',
      'Em <b>Familiares e contatos</b>, clique em Acrescentar. Marque quem é o <b>responsável</b> e quem chamar numa <b>emergência</b>: eles aparecem em destaque no alto da ficha, com o botão Ligar.',
      '<b>Imprimir</b> gera a ficha em papel, com a data e quem imprimiu.',
    ],
    dicas: [
      'Alergias aparecem numa faixa vermelha no alto da ficha: mantenha sempre atualizado.',
      'Se duas pessoas editarem a mesma ficha ao mesmo tempo, o sistema avisa antes de uma apagar o trabalho da outra.',
      'Por causa da LGPD (dados de saúde), o sistema anota quem abriu cada ficha. Só a administração pode excluir uma ficha.',
    ],
  },
  diario: {
    nome: 'Diário',
    serve: 'O caderno da equipe, no computador: a evolução de cada residente e tudo o que fugir da rotina (queda, febre, recusa de comida, visita, recado para o próximo turno). Fica tudo registrado com quem anotou e quando.',
    passos: [
      'Clique em <b>Anotar</b>. Escolha sobre quem é (ou “recado geral da equipe”), o que é (evolução, queda, saúde…) e escreva o que aconteceu.',
      'Escolha a <b>gravidade</b>: <b>Normal</b> só registra; <b>Atenção</b> e <b>Grave</b> ficam em destaque no Início e no menu até alguém clicar em <b>Resolver</b>.',
      'Se mediu pressão, temperatura, glicemia, saturação ou batimentos, abra <b>Sinais vitais</b> e anote.',
      'Use as setas ou o calendário para ver outros dias, e os botões <b>Manhã / Tarde / Noite</b> para ver um turno.',
      '<b>Imprimir</b> gera a folha do dia — boa para a passagem de plantão.',
    ],
    dicas: [
      'Escreva como contaria para a colega do próximo turno: o que aconteceu, o que foi feito e quem foi avisado.',
      'Queda já vem marcada como Atenção. Registro Grave: avise a enfermagem na hora — o sistema não liga para ninguém.',
      'Errou? Clique no lápis para corrigir (só quem escreveu ou a administração). O diário é histórico do cuidado: apagar é só com a administração.',
      'Na ficha de cada residente aparecem as últimas anotações dele, e “Ver tudo” mostra o diário completo daquela pessoa.',
    ],
  },
  agenda: {
    nome: 'Agenda',
    serve: 'Todos os compromissos do lar num lugar só: consultas, exames, vacinas, visitas e atividades (culto, festa, oficina). Mostra quem acompanha, o transporte e o que levar.',
    passos: [
      'Clique em <b>Agendar</b> (ou no “+ Agendar” embaixo de um dia). Escolha para quem é — ou “Todo o lar” para culto, festa e atividades —, o tipo, o título, o dia e a hora.',
      'Preencha <b>Quem acompanha</b> e <b>Transporte</b>: assim ninguém é pego de surpresa no dia.',
      'Clique num compromisso para ver os detalhes. Depois que aconteceu, clique em <b>Foi feito</b> e anote o resultado (ex.: “retorno em 30 dias”).',
      'Se não vai acontecer, use <b>Desmarcar</b> (fica no histórico com o motivo).',
      'Troque entre <b>Semana</b> e <b>Próximos 30 dias</b>. As setas andam uma semana (ou 30 dias).',
    ],
    dicas: [
      'Cada tipo tem uma cor: consulta azul, exame lilás, vacina verde-escuro, visita laranja, atividade verde.',
      'Na ficha de cada residente aparecem os próximos compromissos dele, e o Início mostra a agenda de hoje e de amanhã.',
      '<b>Imprimir</b> gera a folha da semana para deixar no posto de enfermagem.',
    ],
  },
  estoque: {
    nome: 'Estoque',
    serve: 'Saber quanto tem de cada coisa (fraldas, remédios, material de enfermagem, alimentos, limpeza), de onde veio (compra, doação, família) e avisar antes de acabar ou vencer.',
    passos: [
      'Cadastre cada item com <b>Novo item</b>: nome, categoria, como é contado (pacote, caixa, frasco…), o <b>estoque mínimo</b> e quanto tem hoje.',
      'Chegou compra ou doação? Clique em <b>+ Entrada</b>, diga a quantidade, <b>de onde veio</b> e a <b>validade</b> da embalagem.',
      'Usou? Clique em <b>− Saída</b> (se for para um residente, dá para dizer para quem).',
      'De vez em quando, conte na prateleira e use <b>Contar</b> (na página do item): o sistema corrige a diferença sozinho.',
      'O filtro <b>Atenção</b> mostra o que está acabando, acabou ou está vencendo (30 dias). Eles também aparecem no Início e no contador do menu.',
    ],
    dicas: [
      'Use os botões <b>−</b> e <b>+</b> para mudar a quantidade sem digitar.',
      'O sistema desconta as saídas primeiro do que vence antes: use sempre o mais antigo primeiro.',
      'Lançou errado? Na página do item, o botão de desfazer (seta) apaga o lançamento — quem lançou pode no mesmo dia; a administração, sempre.',
      'Item que não se usa mais: <b>Arquivar</b> (some da lista, mas o histórico fica).',
      '<b>Imprimir</b> gera a lista para conferir ou levar na compra.',
    ],
  },
  medicacao: {
    nome: 'Remédios de hoje',
    serve: 'A folha de remédios do dia: cada remédio de cada residente, em cada horário. Quem dá o remédio marca na hora — fica registrado quem deu e a que horas.',
    passos: [
      'Os remédios aparecem agrupados por <b>horário</b>. Ao abrir, a tela já mostra o <b>turno de agora</b>.',
      'Deu o remédio? Clique em <b>Dei</b> (um toque só). Aparece “Dado às 08:05 · seu nome”.',
      'Se a pessoa <b>recusou</b> ou o remédio <b>não foi dado</b> (dormindo, vomitou, no hospital), use o botão certo e escreva o motivo.',
      'Remédios <b>“se necessário”</b> ficam no fim da página: só dê quando a condição acontecer (dor, febre…), e clique em <b>Dar agora</b> dizendo por quê.',
      'Ligue <b>Só o que falta</b> para ver apenas o que ainda não foi marcado. <b>Imprimir a folha</b> gera o papel do dia.',
    ],
    dicas: [
      '<b>Atrasado</b> (laranja) = passou mais de 1 hora do horário e ninguém marcou. Confira se foi dado.',
      'Um horário só pode ser marcado uma vez: se outra pessoa já marcou, o sistema avisa — isso evita dar o remédio em dobro.',
      'Marcou errado? A setinha de desfazer aparece para quem marcou (no mesmo dia) e para a administração.',
      'O aviso vermelho de <b>alergia</b> aparece quando o nome do remédio bate com uma alergia da ficha. É só uma ajuda: sempre confira.',
    ],
  },
  prescricoes: {
    nome: 'Prescrições',
    serve: 'O que cada residente toma: remédio, dose, via (boca, sonda, colírio…), horários e até quando. É daqui que sai a folha de remédios do dia.',
    passos: [
      'Clique em <b>Nova prescrição</b> e copie <b>exatamente</b> da receita do médico: remédio com a concentração (ex.: Losartana 50 mg), dose e via.',
      'Escolha <b>Horários fixos</b> (marque os horários) ou <b>Se necessário</b> (escreva quando dar: “se dor ou febre acima de 37,8 °C”).',
      'Tem data para terminar (antibiótico de 7 dias)? Preencha <b>Termina em</b>. Em branco = uso contínuo.',
      'O médico mandou parar? Nos três pontinhos, <b>Suspender</b> (com o motivo). Mudou a dose ou o horário? Suspenda a antiga e cadastre uma nova.',
    ],
    dicas: [
      'Se o remédio bater com uma alergia da ficha, o sistema pede confirmação antes de salvar.',
      'Na ficha de cada residente aparecem os “Remédios em uso”.',
      'Imprima a lista para deixar no posto de enfermagem.',
    ],
  },
  config: {
    nome: 'Configurações',
    serve: 'Área da administração: nome do lar, bloqueio de tela, usuários, cópias de segurança, acesso pelo celular, atualizações e auditoria.',
    passos: [
      '<b>Geral:</b> nome do lar, tempo para bloquear a tela sozinha e a demonstração (dados fictícios para treinar).',
      '<b>Usuários:</b> crie uma conta para cada pessoa da equipe. A senha inicial é trocada no primeiro acesso. Quem sair da equipe: desative a conta (não apague).',
      '<b>Cópias de segurança:</b> aponte a pasta para um pen drive ou o OneDrive, defina uma senha e teste uma restauração de vez em quando.',
      '<b>Celular e rede:</b> ligue o acesso, reinicie e aponte a câmera do celular para o QR Code.',
      '<b>Atualizações:</b> procura e aplica versões novas do sistema (com cópia de segurança antes).',
      '<b>Auditoria:</b> mostra quem fez o quê e quando.',
    ],
    dicas: [
      'Cópia que nunca foi restaurada não é garantia: faça um teste de restauração depois de configurar.',
      'O acesso pelo celular só funciona no Wi-Fi interno do lar. Nunca libere no Wi-Fi de visitantes.',
    ],
  },
};

function abrirAjuda(rota) {
  const a = AJUDA[rota] || AJUDA[ROTA_PAI[rota]] || AJUDA.inicio;
  modal(`Ajuda — ${a.nome}`, `<div class="ajuda">
      <h3>Para que serve</h3><p>${a.serve}</p>
      <h3>Passo a passo</h3><ol>${a.passos.map((p) => `<li>${p}</li>`).join('')}</ol>
      ${a.dicas && a.dicas.length ? `<h3>Dicas</h3><ul>${a.dicas.map((p) => `<li>${p}</li>`).join('')}</ul>` : ''}
    </div>`, { rascunho: false, rodape: '<button type="button" class="btn primario" data-fechar>Entendi</button>' });
}
