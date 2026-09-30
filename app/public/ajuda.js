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
  vacinas: {
    nome: 'Vacinas',
    serve: 'O cartão de vacina de cada residente no computador: quais vacinas tomou, quando, lote e onde — e o aviso de quem está com dose atrasada.',
    passos: [
      'Para começar, abra o <b>Cartão</b> de cada residente e copie da caderneta as doses que ele já tomou (<b>Registrar vacina</b>).',
      'Quando a UBS vier vacinar no lar, use <b>Campanha (vários)</b>: escolha a vacina, a data e o lote e marque quem tomou. Quem ainda não tomou a vacina no ano já vem marcado.',
      'A tabela mostra a última dose das vacinas principais. <b>Vermelho</b> = atrasada; <b>laranja</b> = vence nos próximos 30 dias.',
      'Se o posto anotou a data da próxima dose (hepatite B, pneumonia), preencha <b>Próxima dose</b>: o sistema avisa quando chegar.',
    ],
    dicas: [
      'Prazos usados: gripe todo ano, Covid a cada 6 meses, dT (tétano) a cada 10 anos. Confira as orientações do posto a cada campanha.',
      'Imprima o cartão de vacina para levar a consultas.',
    ],
  },
  escala: {
    nome: 'Escala',
    serve: 'A escala de turnos do mês: quem trabalha em cada dia e em qual turno (manhã, tarde, noite, plantão de 12 horas), folgas, férias e atestados.',
    passos: [
      'Primeiro cadastre a equipe em <b>Profissionais</b> (com “Aparece na escala” ligado).',
      '<b>Preencher com padrão</b>: escolha a pessoa, o padrão (ex.: 12x36 de dia) e o primeiro dia de trabalho — o mês se preenche sozinho.',
      'Para ajustar um dia (troca de plantão, falta, atestado), <b>clique no quadradinho</b> daquele dia e escolha o código.',
      'As duas linhas de baixo contam quantas pessoas trabalham <b>de dia</b> e <b>de noite</b>. Um <b>0 vermelho</b> é um dia sem ninguém escalado.',
      'Use as setas para ver outros meses e <b>Imprimir</b> para colocar no mural.',
    ],
    dicas: ['Só a administração muda a escala; todos podem ver.', 'O Início mostra quem está no plantão hoje.', 'Os códigos e horários são provisórios: ajuste com a chefe como são os plantões do Lar.'],
  },
  profissionais: {
    nome: 'Profissionais',
    serve: 'O cadastro da equipe do lar e dos profissionais de fora que atendem os residentes (médicos, enfermagem, fisioterapia, nutrição, voluntários) — o “corpo clínico”.',
    passos: [
      'Clique em <b>Novo profissional</b>: nome, função, registro (CRM, COREN…), especialidade, vínculo e telefone.',
      'Quem trabalha em turnos no lar fica com <b>Aparece na escala</b> ligado. Médicos e prestadores de fora, desligado.',
      'Quando alguém sair do lar, edite e desligue “Ainda trabalha no lar” (o histórico fica).',
    ],
    dicas: ['Clique no telefone para ligar (no celular).', 'Os médicos cadastrados aparecem como sugestão ao preencher uma prescrição.'],
  },
  patrimonio: {
    nome: 'Patrimônio',
    serve: 'Tudo o que o lar tem (camas, cadeiras de rodas, eletrodomésticos, extintores, oxigênio, o carro): onde está, estado, quem usa e o histórico de consertos — com aviso antes da revisão vencer.',
    passos: [
      'Clique em <b>Novo item</b>: nome, categoria, número de patrimônio (se tiver etiqueta), onde está e o estado.',
      'Para itens que precisam de revisão (extintor, cilindro de oxigênio, aparelho de pressão, carro), preencha <b>Próxima revisão</b>.',
      'Quebrou ou foi consertado? Abra o item e clique em <b>Registrar manutenção</b> (dá para mudar o estado e a próxima revisão na mesma hora).',
      'O filtro <b>Atenção</b> mostra o que está ruim, em manutenção ou com revisão vencendo (30 dias).',
      'Item que não se usa mais: mude o estado para <b>Baixado</b> (o histórico fica).',
    ],
    dicas: ['Se um residente usa o item (cadeira de rodas, andador), escolha em “Em uso por”.', 'Imprima a lista para conferir o inventário uma vez por ano.'],
  },
  sinais: {
    nome: 'Sinais vitais',
    serve: 'A ronda de sinais vitais (pressão, temperatura, glicemia, saturação, batimentos e dor) de todos os residentes numa tabela só — e os gráficos de cada um para ver se está melhorando ou piorando.',
    passos: [
      'Na <b>ronda do dia</b>, cada linha é um residente. Preencha só o que mediu: pressão como <b>120x80</b>, temperatura com vírgula (<b>36,5</b>).',
      'Valor fora do normal fica <b>vermelho</b> enquanto você digita. Confira e avise a enfermagem.',
      'Clique em <b>Salvar a ronda</b> no fim: salva todos de uma vez, com a hora da ronda.',
      'Clique no <b>nome</b> do residente para ver os <b>gráficos</b> dos últimos 7, 30 ou 90 dias (ou a <b>tabela</b> com todos os números).',
    ],
    dicas: [
      'Os sinais anotados no Diário também aparecem nos gráficos.',
      'Passe o mouse (ou o dedo) no gráfico para ver cada medida, com dia e hora.',
      'As faixas de “normal” são provisórias para idosos: a enfermagem pode pedir para ajustar.',
    ],
  },
  tarefas: {
    nome: 'Tarefas',
    serve: 'A lista de afazeres da equipe: ligar para uma família, comprar algo que acabou, consertar, organizar — com responsável, prazo e o que se repete.',
    passos: [
      'Clique em <b>Nova tarefa</b>: o que precisa ser feito, quem é o responsável (ou “Equipe toda”) e o prazo.',
      'Fez? Clique no <b>círculo</b> ao lado da tarefa. Ela vai para “Feitas” com seu nome e a hora.',
      'Tarefa de rotina (trocar roupa de cama, conferir validades)? Escolha <b>Repetir</b>: ao marcar como feita, a próxima é criada sozinha.',
      'Use <b>Minhas</b> para ver só as suas (e as da equipe toda). Marque <b>Urgente</b> no que não pode esperar.',
    ],
    dicas: ['Atrasadas ficam no topo, com uma faixa vermelha.', 'Na Agenda, compromissos também podem se repetir (culto toda quarta, fisioterapia): escolha “Repetir” ao agendar.'],
  },
  avaliacoes: {
    nome: 'Avaliações',
    serve: 'As escalas que a enfermagem usa para acompanhar cada residente: Katz (o quanto faz sozinho no dia a dia), Braden (risco de ferida por pressão) e Morse (risco de queda).',
    passos: [
      'Na tabela, clique em <b>Avaliar</b> (ou <b>Reavaliar</b>) na escala e no residente.',
      'Marque uma resposta em cada pergunta. A <b>pontuação e o risco</b> aparecem embaixo enquanto você marca.',
      'Na reavaliação, as respostas da última vez já vêm marcadas: mude só o que mudou.',
      'Use os filtros <b>Fazer / reavaliar</b> (sem avaliação ou com mais de 90 dias) e <b>Risco alto</b>.',
      'Clique no nome para ver o <b>histórico</b> (a setinha ↑ ↓ mostra se melhorou ou piorou).',
    ],
    dicas: ['Braden: quanto MENOR, maior o risco de ferida. Morse: quanto MAIOR, maior o risco de queda.', 'O texto das perguntas foi simplificado: a enfermagem deve conferir antes do uso oficial.'],
  },
  pia: {
    nome: 'PIA — Plano Individual de Atenção',
    serve: 'O plano de cuidado de cada residente, por área (saúde, alimentação, quedas, pele, memória, família, lazer): como está hoje, o que queremos, o que a equipe vai fazer e quem é o responsável. A norma da Anvisa pede um por residente.',
    passos: [
      'Na lista, clique em <b>Fazer o PIA</b> (ou <b>Ver o plano</b>).',
      'A <b>situação atual</b> de cada área já vem sugerida com o que está no sistema (doenças, alergias, remédios, avaliações, dieta, família). Confira e ajuste.',
      'Escreva as <b>metas</b> e os <b>cuidados combinados</b> de cada área e quem é o <b>responsável</b>.',
      'A cada 6 meses (ou quando algo mudar), clique em <b>Revisar</b>: vira uma versão nova e a anterior fica guardada.',
      '<b>Imprimir</b> gera o documento com espaço para as assinaturas.',
    ],
    dicas: ['Faça o PIA com a equipe, a pessoa e a família.', 'O botão “Usar a sugestão do sistema” atualiza a situação atual com os dados mais recentes.'],
  },
  prontuario: {
    nome: 'Prontuário',
    serve: 'Tudo o que o sistema sabe de um residente numa página só: identificação, alergias, remédios em uso, avaliações, resumo dos sinais vitais, PIA, consultas, vacinas e o diário do período.',
    passos: [
      'Na ficha do residente, clique em <b>Prontuário</b>.',
      'Escolha o período: <b>30 dias</b>, <b>90 dias</b> ou <b>1 ano</b> (vale para sinais vitais, consultas e diário).',
      'Clique em <b>Imprimir o prontuário</b> para levar a uma consulta, a um hospital ou para arquivar.',
    ],
    dicas: ['Os sinais vitais aparecem resumidos (média, menor e maior). Os gráficos ficam em Saúde › Sinais vitais.', 'O prontuário só mostra: para mudar algo, use a tela de cada módulo.'],
  },
  financeiro: {
    nome: 'Financeiro — Resumo',
    serve: 'O dinheiro do lar no mês: quanto entrou, quanto saiu, o saldo, o que está atrasado e o que vence nos próximos dias. Só a administração vê.',
    passos: [
      'Use as setas para ver outros meses.',
      'Os números de cima contam pela <b>data do pagamento</b> (o que realmente entrou e saiu).',
      'Em <b>Atrasados</b> e <b>Vencem nos próximos 7 dias</b>, clique em <b>Receber</b> ou <b>Pagar</b> quando acontecer.',
      'O <b>Resultado do mês por categoria</b> mostra de onde veio e para onde foi o dinheiro — imprima para a prestação de contas.',
    ],
    dicas: ['Passe o mouse nas barras do gráfico para ver o valor de cada mês.', 'Boleto bancário não é emitido pelo sistema (precisa de contrato com banco).'],
  },
  lancamentos: {
    nome: 'Contas',
    serve: 'Todas as receitas e despesas do mês, com vencimento, situação (em aberto, atrasada, paga) e o recibo das receitas recebidas.',
    passos: [
      '<b>Lançar conta</b>: escolha receita ou despesa, a categoria, a descrição, o valor e o vencimento. Para contas fixas (luz, salários), escolha <b>Repetir por</b> 3, 6 ou 12 meses.',
      'Quando pagar ou receber, clique em <b>Pagar</b> / <b>Receber</b> e informe a data, o valor e a forma (Pix, dinheiro…).',
      'Receita recebida tem <b>Recibo</b> pronto para imprimir.',
      'Nos três pontinhos: editar, desfazer o pagamento ou apagar.',
    ],
    dicas: ['Use os filtros para ver só receitas, só despesas, só as atrasadas…', 'O total do filtro aparece no fim da tabela.'],
  },
  mensalidades: {
    nome: 'Mensalidades',
    serve: 'A mensalidade de cada residente: valor, dia de vencimento, se já pagou neste mês, e o recibo.',
    passos: [
      'Defina o <b>valor</b> e o <b>dia do vencimento</b> de cada residente (botão <b>Definir valor</b>).',
      'No começo do mês, clique em <b>Gerar as mensalidades do mês</b>: cria a cobrança de todos de uma vez.',
      'Quando a família pagar, clique em <b>Receber</b>. Depois, <b>Recibo</b> para imprimir.',
    ],
    dicas: ['Mensalidade que passou do vencimento sem pagamento aparece como <b>Atrasado</b> e também no Resumo.'],
  },
  recibo: { nome: 'Recibo', serve: 'O recibo de uma receita recebida, com o valor por extenso, pronto para imprimir e assinar.', passos: ['Clique em <b>Imprimir o recibo</b>.'], dicas: [] },
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
