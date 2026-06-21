const catalogoContainer = document.getElementById('catalogoCards');
const catalogoFilter = document.getElementById('catalogoFilter');
let productosCatalogo = [];


function formatearPrecio(valor) {
  return `₡ ${valor.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} `;
}

function crearTarjetaProducto(producto) {
  const card = document.createElement('article');
  card.className = 'card product-card';
  card.innerHTML = `
    <h3>${producto.nombre}</h3>
    <p class="product-sku"><strong>SKU:</strong> ${producto.sku}</p>
    <p>${producto.detalle}</p>
    <div class="product-meta">
    <span><strong>Precio:</strong> ${formatearPrecio(producto.precio)}</span>
    </div>
  `;
  return card;
}

function renderizarProductos(productos) {
  catalogoContainer.innerHTML = '';
  if (!productos.length) {
    catalogoContainer.innerHTML = '<p>No se encontraron productos.</p>';
    return;
  }
  productos.forEach(producto => {
    const tarjeta = crearTarjetaProducto(producto);
    catalogoContainer.appendChild(tarjeta);
  });
}

function filtrarProductos() {
  const termino = catalogoFilter.value.trim().toLowerCase();
  if (!termino) {
    renderizarProductos(productosCatalogo);
    return;
  }
  const filtrados = productosCatalogo.filter(producto => {
    return producto.nombre.toLowerCase().includes(termino) || producto.sku.toLowerCase().includes(termino);
  });
  renderizarProductos(filtrados);
}

async function cargarProductos() {
  try {
    const respuesta = await fetch('data/productos.json');
    if (!respuesta.ok) {
      throw new Error('No se pudo cargar el catálogo');
    }
    productosCatalogo = await respuesta.json();

    if (!Array.isArray(productosCatalogo) || productosCatalogo.length === 0) {
      catalogoContainer.innerHTML = '<p>No se encontraron productos.</p>';
      return;
    }

    renderizarProductos(productosCatalogo);
  } 
  catch (error) {
    console.error(error);
    catalogoContainer.innerHTML = `<p class="error-msg">${error.message}</p>`;
  }
}

catalogoFilter?.addEventListener('input', filtrarProductos);


cargarProductos();