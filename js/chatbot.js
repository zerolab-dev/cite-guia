'use strict';

// ==========================================
// CITEguía v0.2 - Motor conversacional
// ==========================================

const $ = id => document.getElementById(id);

const state = {
  data: null,
  phase: 'loading',
  scenario: null,
  index: 0,
  answers: [],
  query: '',
  region: ''
};

// Normalizar texto
function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Hora del mensaje
function time() {
  return new Date().toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Desplazamiento automático
function scroll() {
  const root = $('messages');
  root.scrollTop = root.scrollHeight;
}

// Mostrar mensaje
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

// Activar o desactivar entrada
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

// Reiniciar conversación
function start() {
  Object.assign(state, {
    phase: 'need',
    scenario: null,
    index: 0,
    answers: [],
    query: '',
    region: ''
  });

  $('messages').replaceChildren();
  $('messageInput').value = '';

  setInput(
    true,
    'Describe tu necesidad productiva...'
  );

  message(
    '¡Hola! Soy CITEguía, tu asistente de orientación tecnológica. 👋\n\n' +
    'Cuéntame qué problema productivo tienes o qué te gustaría mejorar.'
  );
}

// Identificar problemática por palabras clave
function detect(input) {
  const n = normalize(input);

  const results = state.data.scenarios.map(s => {
    let score = 0;

    s.keywords.forEach(keyword => {
      const k = normalize(keyword);

      if (k && n.includes(k)) {
        score += k.length > 5 ? 2 : 1;
      }
    });

    return { scenario: s, score };
  });

  results.sort((a, b) => b.score - a.score);

  return results[0] || null;
}

// Seleccionar ruta
function selectScenario(s) {
  if (!s) return;

  state.scenario = s;
  state.index = 0;
  state.answers = [];
  state.phase = 'region';

  message(
    'Entiendo. Tu consulta parece estar relacionada con ' +
    s.title.toLowerCase() + '.\n\n' +
    'Para orientarte mejor, ¿en qué región desarrollas tu actividad productiva?'
  );
}

// Verificar región
function regionMatch(text, region) {
  return normalize(text).includes(normalize(region));
}

// Realizar pregunta técnica
function ask() {
  state.phase = 'questions';

  const s = state.scenario;
  const q = s.questions[state.index];

  if (!q) {
    finish();
    return;
  }

  message(q.text);

  setInput(true, 'Escribe tu respuesta...');
}

// Crear resultado de orientación
function finish() {
  state.phase = 'finished';

  const s = state.scenario;

  message(
    'Gracias por compartir esta información. ' +
    'De acuerdo con la necesidad que has descrito, ' +
    'he identificado una posible ruta de orientación tecnológica.'
  );

  const card = document.createElement('section');
  card.className = 'result';

  const title = document.createElement('h3');
  title.textContent = 'Tu ruta de orientación tecnológica';
  card.append(title);

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

  fields.forEach(([label, value]) => {
    const dt = document.createElement('dt');
    dt.textContent = label;

    const dd = document.createElement('dd');
    dd.textContent = value;

    dl.append(dt, dd);
  });

  card.append(dl);

  const description = document.createElement('p');
  description.textContent = s.serviceDescription;
  card.append(description);

  // Enlace oficial, si está configurado
  if (
    s.pageUrl &&
    /^https:\/\//i.test(s.pageUrl)
  ) {
    const link = document.createElement('a');

    link.href = s.pageUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Ver servicio en CITEsmart ↗';

    card.append(link);
  } else {
    const note = document.createElement('div');
    note.className = 'unavailable';
    note.textContent =
      'Enlace al servicio pendiente de configuración.';

    card.append(note);
  }

  const disclaimer = document.createElement('p');
  disclaimer.className = 'note';
  disclaimer.textContent =
    'Esta orientación es preliminar. La pertinencia ' +
    'y disponibilidad del servicio deben confirmarse con el CITE.';

  card.append(disclaimer);

  $('messages').append(card);
  scroll();

  message(
    'Si deseas realizar otra consulta, escribe "nueva conversación".'
  );

  setInput(
    true,
    'Escribe "nueva conversación" para continuar...'
  );
}

// Procesar texto del usuario
function submit(text) {
  if (!text.trim()) return;

  message(text, 'user');
  $('messageInput').value = '';

  const n = normalize(text);

  // Comandos de reinicio
  const resetCommands = [
    'reiniciar',
    'nueva conversacion',
    'empezar de nuevo',
    'otra consulta'
  ];

  if (resetCommands.includes(n)) {
    start();
    return;
  }

  // Fase 1: identificar necesidad
  if (state.phase === 'need') {
    const result = detect(text);

    if (result && result.score > 0) {
      state.query = text;
      selectScenario(result.scenario);
    } else {
      message(
        'Para orientarte mejor, ¿podrías contarme ' +
        'qué producto elaboras, qué material trabajas ' +
        'o cuál es la dificultad técnica que enfrentas?'
      );
    }

    return;
  }

  // Fase 2: identificar región
  if (state.phase === 'region') {
    const expected = state.scenario.region;

    if (regionMatch(text, expected)) {
      state.region = expected;

      message(
        'Gracias. Tomaré como referencia la región ' +
        expected + '.\n\n' +
        'Ahora quisiera conocer un poco más sobre tu actividad.'
      );

      ask();
    } else {
      message(
        'Gracias por indicarme tu ubicación. ' +
        'Para continuar con esta orientación, ' +
        '¿tu actividad se desarrolla en la región ' +
        expected + '?\n\n' +
        'Si es así, escribe el nombre de la región. ' +
        'Si trabajas en otra región, puedes iniciar ' +
        'una nueva consulta.'
      );
    }

    return;
  }

  // Fase 3: preguntas técnicas
  if (state.phase === 'questions') {
    if (n.length < 3) {
      message(
        '¿Podrías darme un poco más de detalle ' +
        'para comprender mejor tu respuesta?'
      );

      return;
    }

    state.answers.push(text);
    state.index++;

    ask();
    return;
  }

  // Fase 4: conversación finalizada
  if (state.phase === 'finished') {
    message(
      'La orientación ha finalizado. ' +
      'Para realizar otra consulta, escribe "nueva conversación".'
    );
  }
}

// Formulario de envío
$('inputForm').addEventListener('submit', event => {
  event.preventDefault();

  if (!state.data || $('messageInput').disabled) {
    return;
  }

  const text = $('messageInput').value.trim();

  submit(text);
});

// Botones de reinicio
$('resetSide').addEventListener('click', start);
$('resetTop').addEventListener('click', start);

// Cargar matriz de escenarios
fetch('data/escenarios.json')
  .then(response => {
    if (!response.ok) {
      throw new Error('No se pudo cargar la matriz');
    }

    return response.json();
  })
  .then(data => {
    state.data = data;
    start();
  })
  .catch(error => {
    console.error(error);

    message(
      'No se pudo cargar la información de orientación tecnológica. ' +
      'Verifica que el archivo escenarios.json esté disponible.'
    );

    setInput(false);
  });
