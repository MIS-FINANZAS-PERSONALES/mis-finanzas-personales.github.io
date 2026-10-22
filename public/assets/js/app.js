document.addEventListener('DOMContentLoaded', async () => {
  try {
    await fdb.init();
    ui.pantallaPrincipal();
  } catch (error) {
    console.error('Error al inicializar:', error);
    document.getElementById('app').innerHTML = `
      <div class="card" style="max-width:500px;margin:5rem auto;">
        <div class="alert alert-error">
          Error al inicializar la aplicación: ${esc(error.message)}
        </div>
        <button class="btn btn-primary" onclick="location.reload()">Reintentar</button>
      </div>
    `;
  }
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').catch(e => console.log('SW:', e));
}
