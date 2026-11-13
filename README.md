# CITEguía v0.1 — prototipo demostrativo

Chatbot estático de orientación tecnológica con cinco rutas predefinidas. No utiliza IA, servidores ni almacenamiento de datos.

## Despliegue en GitHub Pages
1. Crear un repositorio público `citeguia`.
2. Subir **el contenido** de esta carpeta a la raíz del repositorio (`index.html`, `css/`, `js/`, `data/`).
3. En **Settings → Pages**, seleccionar **Deploy from a branch**, rama `main`, carpeta `/ (root)` y guardar.
4. Abrir la URL que GitHub Pages muestre en Settings → Pages.

## Pruebas sugeridas
- «Mis quesos se malogran rápido» → Arequipa → CITEagroindustrial Majes.
- «Quiero aprovechar los residuos de mi carpintería» → Loreto → CITEforestal Maynas.
- «Quiero desarrollar subproductos de paiche» → San Martín → CITEproductivo San Martín.
- «Tengo problemas con el curtido de pieles» → La Libertad → CITEcuero y calzado Trujillo.
- «Quiero desarrollar tejidos de alpaca» → Cusco → CITEtextil camélidos Cusco.

## Personalización
- `data/escenarios.json`: preguntas, opciones, palabras clave, servicio, CITE y descripción.
- Para activar el botón de destino, reemplazar `pageUrl: null` por la URL **oficial verificada** de la página del servicio en CITEsmart. No se incluyen URL inventadas.
- `css/style.css`: colores y estilo.
- `js/chatbot.js`: lógica de detección, navegación y resultados.

## Limitaciones conocidas
- Las respuestas seleccionadas no alteran la recomendación final: cada ruta lleva a un servicio y CITE predeterminados.
- El reconocimiento por palabras clave es básico; una consulta ambigua puede seleccionar una ruta incorrecta.
- Los nombres de servicios y su pertinencia deben validarse con el catálogo oficial antes de su uso institucional.
- La selección de otra región permite continuar únicamente como ejemplo del escenario preconfigurado.
- Para pruebas locales ejecutar `python -m http.server 8000` desde la carpeta y abrir `http://localhost:8000`.
