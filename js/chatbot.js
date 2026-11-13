
'use strict';

// ============================================
// CITEguía v0.2.1
// Motor de conversación por texto
// ============================================

const $ = id => document.getElementById(id);

const state = {
  data: null,
  phase: 'loading',
  scenario: null,
  index: 0,
  answers: [],
  query: '',
  region: '',
  candidates: []
};

// ============================================
// FUNCIONES GENERALES
// ============================================

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function time() {
  return new Date().toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function scroll() {
  const root = $('messages');
  root.scrollTop = root.scrollHeight;
}

function message(text, who = 'bot') {
  const el = document.createElement('div');
  el.className = `message ${who}`;

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;

  const stamp = document.createElement('small');
  stamp.textContent = time();

  el.append(bubble, stamp);
  $('messages').append(el);

  scroll();
}

function setInput(
  active,
  placeholder = 'Escribe tu respuesta...'
) {
  $('messageInput').disabled = !active;
  $('sendBtn').disabled = !active;
  $('messageInput').placeholder = placeholder;

  if (active) {
    $('messageInput').focus();
  }
}

// ============================================
// INICIO DE CONVERSACIÓN
// ============================================

function start() {
  Object.assign(state, {
    phase: 'need',
    scenario: null,
    index: 0,
    answers: [],
    query: '',
    region: '',
    candidates: []
  });

  $('messages').replaceChildren();
  $('messageInput').value = '';

  setInput(
    true,
    'Escribe tu necesidad productiva...'
  );

  message(
    '¡Hola! Soy CITEguía, tu asistente de ' +
    'orientación tecnológica. 👋\n\n' +
    'Cuéntame, ¿qué problema tienes en tu ' +
    'actividad productiva o qué te gustaría mejorar?'
  );
}

// ============================================
// RECONOCIMIENTO DE NECESIDADES
// ============================================

// Comprueba palabras o frases completas.
// Evita coincidencias accidentales dentro
// de otras palabras.

function containsTerm(text, term) {
  const n = normalize(text);
  const k = normalize(term);

  if (!k) return false;

  return (` ${n} `).includes(` ${k} `);
}

// Calcula coincidencias de cada escenario
// utilizando las palabras del JSON.

function rankScenarios(input) {
  return state.data.scenarios
    .map(s => {
      let score = 0;

      s.keywords.forEach(keyword => {
        if (containsTerm(input, keyword)) {
          score += normalize(keyword).length > 5
            ? 2
            : 1;
        }
      });

      return { scenario: s, score };
    })
    .sort((a, b) => b.score - a.score);
}

// Detecta un escenario solo cuando existe
// una coincidencia suficiente y no ambigua.

function detect(input) {
  const results = rankScenarios(input);

  if (!results.length || results[0].score === 0) {
    return null;
  }

  // Si hay empate, solicitar más información.
  if (
    results.length > 1 &&
    results[0].score === results[1].score
  ) {
    return null;
  }

  return results[0].scenario;
}

// ============================================
// IDENTIFICACIÓN DE ESCENARIO
// ============================================

function selectScenario(s) {
  if (!s) return;

  state.scenario = s;
  state.index = 0;
  state.answers = [];
  state.region = '';
  state.phase = 'region';

  message(
    'Entiendo. Por lo que me comentas, ' +
    'tu necesidad está relacionada con ' +
    s.title.toLowerCase() + '.\n\n' +
    'Para orientarte mejor, ¿en qué región ' +
    'del Perú desarrollas tu actividad productiva?'
  );

  setInput(true, 'Escribe tu región...');
}

// ============================================
// IDENTIFICACIÓN GEOGRÁFICA
// ============================================

function identifyRegion(text) {
  const n = normalize(text);

  const regions = [
    'Amazonas',
    'Áncash',
    'Apurímac',
    'Arequipa',
    'Ayacucho',
    'Cajamarca',
    'Callao',
    'Cusco',
    'Huancavelica',
    'Huánuco',
    'Ica',
    'Junín',
    'La Libertad',
    'Lambayeque',
    'Lima',
    'Loreto',
    'Madre de Dios',
    'Moquegua',
    'Pasco',
    'Piura',
    'Puno',
    'San Martín',
    'Tacna',
    'Tumbes',
    'Ucayali'
  ];

  const matches = regions.filter(region => {
    return containsTerm(n, region);
  });

  return matches.length === 1 ? matches[0] : null;
}

function processRegion(text) {
  const region = identifyRegion(text);

  if (!region) {
    message(
      '¿Podrías indicarme el nombre de la ' +
      'región donde desarrollas tu actividad?'
    );
    return;
  }

  const expected = state.scenario.region;

  if (normalize(region) !== normalize(expected)) {
    message(
      'Gracias por indicarme tu ubicación. ' +
      'Por el momento no tengo una ruta de ' +
      'orientación configurada para esa ' +
      'necesidad en ' + region + '.\n\n' +
      'Puedes describirme otra necesidad ' +
      'productiva escribiendo "nueva conversación".'
    );

    state.phase = 'unsupported';
    return;
  }

  state.region = expected;

  message(
    'Gracias. Tomaré como referencia ' +
    'la región ' + expected + '.\n\n' +
    'Ahora quisiera conocer algunos detalles ' +
    'de tu actividad para brindarte una ' +
    'orientación más precisa.'
  );

  ask();
}

// ============================================
// PREGUNTAS TÉCNICAS
// ============================================

function ask() {
  const s = state.scenario;

  if (state.index >= s.questions.length) {
    finish();
    return;
  }

  state.phase = 'questions';

  const q = s.questions[state.index];

  message(q.text);

  setInput(true, 'Escribe tu respuesta...');
}

function processAnswer(text) {
  const n = normalize(text);

  if (!n || n.length < 2) {
    message(
      '¿Podrías brindarme un poco más ' +
      'de información sobre tu respuesta?'
    );
    return;
  }

  // Guardar respuesta textual del usuario.
  state.answers.push({
    question: state.scenario.questions[state.index].text,
    answer: text
  });

  state.index++;

  if (state.index < state.scenario.questions.length) {
    message('Comprendo. Gracias por la información.');
  }

  ask();
}

// ============================================
// RESULTADO DE ORIENTACIÓN
// ============================================

function finish() {
  state.phase = 'finished';

  const s = state.scenario;

  message(
    'Gracias por compartir esta información. ' +
    'He preparado una orientación tecnológica ' +
    'inicial de acuerdo con la necesidad ' +
    'que me has comentado.'
  );

  const card = document.createElement('section');
  card.className = 'result';

  const h = document.createElement('h3');
  h.textContent = 'Tu ruta de orientación tecnológica';
  card.append(h);

  const tag = document.createElement('span');
  tag.className = 'tag';
  tag.textContent = 'Orientación tecnológica';
  card.append(tag);

  const dl = document.createElement('dl');

  const fields = [
    ['Necesidad identificada', s.summary],
    ['Cadena productiva', s.sector],
    ['Región', state.region],
    ['Servicio sugerido', s.service],
    ['CITE de referencia', s.cite]
  ];

  fields.forEach(([key, value]) => {
    const dt = document.createElement('dt');
    dt.textContent = key;

    const dd = document.createElement('dd');
    dd.textContent = value;

    dl.append(dt, dd);
  });

  card.append(dl);

  const desc = document.createElement('p');
  desc.textContent = s.serviceDescription;
  card.append(desc);

  // Enlace al servicio de CITEsmart.
  if (
    s.pageUrl &&
    /^https:\/\//i.test(s.pageUrl)
  ) {
    const a = document.createElement('a');

    a.href = s.pageUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = 'Ver servicio en CITEsmart ↗';

    card.append(a);
  } else {
    const note = document.createElement('div');
    note.className = 'unavailable';

    note.textContent =
      'El enlace al servicio estará disponible próximamente.';

    card.append(note);
  }

  // Advertencia técnica breve.
  const disclaimer = document.createElement('p');
  disclaimer.className = 'note';

  disclaimer.textContent =
    'La orientación es preliminar. La pertinencia ' +
    'y disponibilidad del servicio deben ' +
    'confirmarse con el CITE correspondiente.';

  card.append(disclaimer);

  $('messages').append(card);
  scroll();

  message(
    'Espero que esta orientación te sea útil. ' +
    'Si deseas realizar otra consulta, ' +
    'puedes escribir "nueva conversación".'
  );

  setInput(
    true,
    'Escribe "nueva conversación"...'
  );
}

// ============================================
// PROCESAMIENTO DE MENSAJES
// ============================================

function submit(text) {
  if (!text || !text.trim()) return;

  text = text.trim();

  message(text, 'user');
  $('messageInput').value = '';

  const n = normalize(text);

  // Comandos globales.
  const commands = [
    'nueva conversacion',
    'reiniciar',
    'empezar de nuevo',
    'otra consulta'
  ];

  if (commands.includes(n)) {
    start();
    return;
  }

  // Fase 1: necesidad inicial.
  if (state.phase === 'need') {
    state.query = text;

    const s = detect(text);

    if (s) {
      selectScenario(s);
    } else {
      state.phase = 'clarify';

      message(
        'Para comprender mejor tu necesidad, ' +
        '¿podrías contarme qué producto elaboras, ' +
        'qué materia prima utilizas o qué proceso ' +
        'productivo deseas mejorar?'
      );
    }

    return;
  }

  // Fase 2: aclaración de necesidad.
  if (state.phase === 'clarify') {
    const combined = state.query + ' ' + text;

    const s = detect(combined);

    if (s) {
      state.query = combined;
      selectScenario(s);
    } else {
      state.query = combined;

      message(
        'Gracias por la información. ' +
        'Todavía necesito comprender mejor ' +
        'tu actividad productiva.\n\n' +
        '¿Qué producto específico elaboras ' +
        'o qué material trabajas?'
      );
    }

    return;
  }

  // Fase 3: ubicación.
  if (state.phase === 'region') {
    processRegion(text);
    return;
  }

  // Fase 4: preguntas técnicas.
  if (state.phase === 'questions') {
    processAnswer(text);
    return;
  }

  // Fase 5: ruta no disponible.
  if (state.phase === 'unsupported') {
    message(
      'Por el momento no tengo una ruta ' +
      'configurada para continuar con esa ' +
      'ubicación. Puedes escribir ' +
      '"nueva conversación" para comenzar otra consulta.'
    );
    return;
  }

  // Fase 6: orientación finalizada.
  if (state.phase === 'finished') {
    message(
      'La orientación ha finalizado. ' +
      'Si deseas realizar otra consulta, ' +
      'escribe "nueva conversación".'
    );
  }
}

// ============================================
// EVENTOS DE INTERFAZ
// ============================================

$('inputForm').addEventListener('submit', e => {
  e.preventDefault();

  if (!state.data || $('messageInput').disabled) {
    return;
  }

  const text = $('messageInput').value.trim();

  submit(text);
});

$('resetSide').addEventListener('click', start);
$('resetTop').addEventListener('click', start);

// ============================================
// CARGA DE MATRIZ DE CONOCIMIENTO
// ============================================

fetch('data/escenarios.json')
  .then(response => {
    if (!response.ok) {
      throw new Error(
        'No se pudo cargar la matriz de escenarios'
      );
    }

    return response.json();
  })
  .then(data => {
    if (
      !data.scenarios ||
      !Array.isArray(data.scenarios)
    ) {
      throw new Error('Formato de matriz inválido');
    }

    state.data = data;
    start();
  })
  .catch(error => {
    console.error(error);

    message(
      'No se pudo cargar la información ' +
      'de orientación tecnológica. ' +
      'Verifica que el archivo ' +
      'data/escenarios.json esté disponible.'
    );

    setInput(false);
  });
