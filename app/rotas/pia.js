// PIA — Plano Individual de Atenção de cada residente (a RDC 502/2021 da Anvisa pede um plano por pessoa).
// Por área: situação atual, metas, cuidados combinados e responsável. Cada revisão é uma versão nova (as antigas ficam).
// O sistema sugere a "situação atual" a partir do que já está cadastrado (ficha, remédios, avaliações, sinais).
'use strict';

const AREAS = [
  ['saude', 'Saúde e remédios', 'Doenças, alergias, remédios em uso, acompanhamento médico.'],
  ['nutricao', 'Alimentação e hidratação', 'Dieta, consistência, ajuda para comer, peso, água.'],
  ['mobilidade', 'Mobilidade e prevenção de quedas', 'Como anda, apoio, risco de queda, fisioterapia.'],
  ['pele', 'Pele, higiene e continência', 'Banho, fraldas, risco de ferida, mudança de posição.'],
  ['cognicao', 'Memória, humor e comportamento', 'Orientação, humor, agitação, sono.'],
  ['social', 'Família, vida social e espiritualidade', 'Visitas, contato com a família, culto, amizades.'],
  ['atividades', 'Atividades e lazer', 'O que gosta de fazer, oficinas, passeios.'],
];
const CAMPOS_AREA = ['situacao', 'metas', 'acoes', 'responsavel'];
const REVISAR_DIAS = 180;
const dataValida = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T12:00:00'));
const somarDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE'); };

module.exports = function pia(ctx) {
  const { rota, db, registrar, falha, json, corpoJson, exigirAdmin, hoje, agoraIso } = ctx;
  const ler = (p) => ({ ...p, areas: JSON.parse(p.areas || '{}') });

  // Sugestão da "situação atual" de cada área, com o que o sistema já sabe da pessoa
  function sugestao(rid) {
    const r = db.prepare('SELECT * FROM residentes WHERE id = ?').get(rid);
    const rem = db.prepare("SELECT medicamento, dose, horarios, se_necessario FROM prescricoes WHERE residente_id = ? AND ativa = 1 AND (fim IS NULL OR fim >= ?)").all(rid, hoje());
    const av = {};
    for (const a of db.prepare('SELECT escala, pontuacao, classificacao FROM avaliacoes WHERE residente_id = ? ORDER BY data, id').all(rid)) av[a.escala] = a;
    const peso = db.prepare('SELECT peso, data FROM sinais WHERE residente_id = ? AND peso IS NOT NULL ORDER BY data DESC LIMIT 1').get(rid);
    const contatos = db.prepare('SELECT nome, parentesco FROM contatos WHERE residente_id = ? ORDER BY responsavel DESC LIMIT 3').all(rid);
    const junta = (...p) => p.filter(Boolean).join(' ');
    return {
      saude: { situacao: junta(r.diagnosticos ? `Diagnósticos: ${r.diagnosticos}.` : '', r.alergias ? `ALERGIAS: ${r.alergias}.` : 'Sem alergias registradas.',
        rem.length ? `Remédios em uso: ${rem.map((x) => `${x.medicamento} (${x.se_necessario ? 'se necessário' : x.horarios})`).join('; ')}.` : 'Sem remédios cadastrados.',
        r.medico ? `Médico(a) de referência: ${r.medico}.` : '') },
      nutricao: { situacao: junta(r.dieta ? `Dieta: ${r.dieta}.` : '', peso ? `Último peso: ${String(peso.peso).replace('.', ',')} kg (${peso.data.split('-').reverse().join('/')}).` : '') },
      mobilidade: { situacao: junta(r.mobilidade ? `Mobilidade: ${r.mobilidade}.` : '', av.morse ? `Risco de queda (Morse): ${av.morse.pontuacao} — ${av.morse.classificacao}.` : '') },
      pele: { situacao: junta(av.braden ? `Risco de ferida (Braden): ${av.braden.pontuacao} — ${av.braden.classificacao}.` : '', av.katz ? `Independência (Katz): ${av.katz.pontuacao}/6 — ${av.katz.classificacao}.` : '') },
      cognicao: { situacao: r.grau_dependencia ? `Grau de dependência ${r.grau_dependencia}.` : '' },
      social: { situacao: junta(contatos.length ? `Família/contatos: ${contatos.map((x) => `${x.nome}${x.parentesco ? ' (' + x.parentesco + ')' : ''}`).join(', ')}.` : 'Sem familiares cadastrados.', r.religiao ? `Religião: ${r.religiao}.` : '') },
      atividades: { situacao: r.obs || '' },
    };
  }

  rota('GET', '/api/pia/painel', async (req, res) => {
    const rs = db.prepare("SELECT id, nome, apelido, quarto, dt_entrada FROM residentes WHERE situacao IN ('no_lar','hospitalizado') ORDER BY nome COLLATE NOCASE").all();
    const ult = db.prepare('SELECT residente_id, MAX(data) data, proxima_revisao FROM pias GROUP BY residente_id').all();
    const h = hoje();
    const linhas = rs.map((r) => { const u = ult.find((x) => x.residente_id === r.id); return { ...r, ultimo: u ? u.data : null, proxima_revisao: u ? u.proxima_revisao : null, vencido: !u || (u.proxima_revisao && u.proxima_revisao < h) }; });
    json(res, 200, { linhas, pendentes: linhas.filter((l) => l.vencido).length });
  });

  // O PIA atual de um residente (?residente=) e a lista de versões; ?id= abre uma versão específica
  rota('GET', '/api/pia', async (req, res, { url }) => {
    const rid = Number(url.searchParams.get('residente'));
    const r = db.prepare('SELECT id, nome, apelido, dt_nasc, quarto, dt_entrada, grau_dependencia FROM residentes WHERE id = ?').get(rid) || falha(404, 'Residente não encontrado');
    const versoes = db.prepare('SELECT p.id, p.data, p.proxima_revisao, p.criado_por, u.nome autor_nome FROM pias p LEFT JOIN usuarios u ON u.login = p.criado_por WHERE p.residente_id = ? ORDER BY p.data DESC, p.id DESC').all(r.id);
    const id = Number(url.searchParams.get('id')) || (versoes[0] && versoes[0].id);
    const atual = id ? db.prepare('SELECT p.*, u.nome autor_nome FROM pias p LEFT JOIN usuarios u ON u.login = p.criado_por WHERE p.id = ? AND p.residente_id = ?').get(id, r.id) : null;
    json(res, 200, { residente: r, atual: atual ? ler(atual) : null, versoes, areas: AREAS, sugestao: sugestao(r.id), revisar_dias: REVISAR_DIAS });
  });

  // Salvar = nova versão
  rota('POST', '/api/pia', async (req, res, { u }) => {
    const b = await corpoJson(req);
    const r = db.prepare('SELECT id, nome, demo FROM residentes WHERE id = ?').get(Number(b.residente_id)) || falha(400, 'Residente não encontrado');
    const data = b.data || hoje();
    if (!dataValida(data) || data > hoje()) falha(400, 'Data inválida');
    const proxima = b.proxima_revisao || somarDias(data, REVISAR_DIAS);
    if (!dataValida(proxima) || proxima <= data) falha(400, 'A próxima revisão precisa ser depois da data do plano');
    const areas = {};
    let preenchido = 0;
    for (const [k] of AREAS) {
      const a = (b.areas || {})[k] || {};
      areas[k] = Object.fromEntries(CAMPOS_AREA.map((c) => { const v = String(a[c] || '').trim().slice(0, 3000); if (v && c !== 'situacao') preenchido++; return [c, v]; }));
    }
    if (!preenchido) falha(400, 'Preencha as metas ou os cuidados de pelo menos uma área');
    const id = Number(db.prepare('INSERT INTO pias (residente_id, data, proxima_revisao, participantes, areas, obs, criado_em, criado_por, demo) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(r.id, data, proxima, String(b.participantes || '').trim().slice(0, 500) || null, JSON.stringify(areas), String(b.obs || '').trim().slice(0, 2000) || null, agoraIso(), u.login, r.demo).lastInsertRowid);
    registrar(u.login, 'salvou o PIA (nova versão)', { residente_id: r.id, nome: r.nome, pia: id });
    json(res, 201, { id });
  });

  rota('DELETE', '/api/pia/:id', async (req, res, { u, p }) => {
    exigirAdmin(u);
    const x = db.prepare('SELECT p.*, r.nome FROM pias p JOIN residentes r ON r.id = p.residente_id WHERE p.id = ?').get(+p.id) || falha(404, 'Versão não encontrada');
    db.prepare('DELETE FROM pias WHERE id = ?').run(x.id);
    registrar(u.login, 'apagou uma versão do PIA', { residente_id: x.residente_id, nome: x.nome, data: x.data });
    json(res, 200, { ok: true });
  });
};

module.exports.AREAS = AREAS;
