const catalogoContainer = document.getElementById('catalogoCards');
const catalogoFilter = document.getElementById('catalogoFilter');
const PRODUCTOS_STORAGE_KEY = 'productos_v1';

function formatearPrecio(valor) {
  return `₡ ${valor.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} `;
}

function crearTarjetaProducto(producto) {
  const card = document.createElement('article');
  card.className = 'card product-card';
  card.innerHTML = `
    <h3>${producto.nombre}</h3>
    <p class="product-sku"><strong>SKU:</strong> ${producto.sku}</p>
    <p>${producto.detalle || ''}</p>
    <div class="product-meta">
      <span><strong>Precio:</strong> ${formatearPrecio(producto.precio)}</span>
      <span><strong>Cantidad:</strong> ${producto.cantidad}</span>
    </div>
  `;
  return card;
}

function renderizarProductos(productos) {
  catalogoContainer.innerHTML = '';
  if (!productos || productos.length === 0) {
    catalogoContainer.innerHTML = '<p>No se encontraron productos.</p>';
    return;
  }
  productos.forEach(producto => catalogoContainer.appendChild(crearTarjetaProducto(producto)));
}

async function cargarProductos() {
  try {
    const stored = localStorage.getItem(PRODUCTOS_STORAGE_KEY);
    let productos = [];
    if (stored) {
      productos = JSON.parse(stored);
    } else {
      const res = await fetch('data/productos.json');
      if (!res.ok) throw new Error('No se pudo cargar productos');
      productos = await res.json();
    }
    renderizarProductos(productos);
    // mantener lista en memoria para filtrar sin recargar
    window.__catalogoProductos = productos;
  } catch (e) {
    console.error(e);
    catalogoContainer.innerHTML = `<p class="error-msg">${e.message}</p>`;
  }
}

function filtrarProductos() {
  const q = catalogoFilter.value.trim().toLowerCase();
  const all = window.__catalogoProductos || [];
  if (!q) return renderizarProductos(all);
  const filtered = all.filter(p => (p.nombre||'').toLowerCase().includes(q) || (p.sku||'').toLowerCase().includes(q));
  renderizarProductos(filtered);
}

catalogoFilter?.addEventListener('input', filtrarProductos);

document.addEventListener('DOMContentLoaded', cargarProductos);