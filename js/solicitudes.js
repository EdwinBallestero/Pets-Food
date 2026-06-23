const PRODUCTS_KEY = 'productos_v1';
const ORDERS_KEY = 'pedidos_local';
let productos = [];
let cart = [];

function formatearPrecio(valor) {
  return `₡ ${valor.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} `;
}

async function init() {
  await loadProducts();
  renderProducts();
  renderCart();
  attachListeners();
  window.addEventListener('storage', handleStorageUpdate);
}

function handleStorageUpdate(event) {
  if (event.key === PRODUCTS_KEY) {
    const updated = JSON.parse(event.newValue || '[]');
    productos = Array.isArray(updated) ? updated : productos;
    renderProducts();
  }
}

async function loadProducts() {
  const stored = localStorage.getItem(PRODUCTS_KEY);
  if (stored) {
    productos = JSON.parse(stored);
    return;
  }

  // Soporte de migración desde la clave antigua
  const OLD_KEY = 'productos_catalogo_local';
  const rawOld = localStorage.getItem(OLD_KEY);
  if (rawOld) {
    try {
      const parsed = JSON.parse(rawOld);
      productos = Array.isArray(parsed) ? parsed : [];
      // guardar bajo la nueva clave y eliminar la antigua
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(productos));
      localStorage.removeItem(OLD_KEY);
      return;
    } catch (e) {
      console.warn('Error parseando productos desde clave antigua', e);
    }
  }
  try {
    const resp = await fetch('data/productos.json');
    if (!resp.ok) throw new Error('No se pudo cargar productos');
    productos = await resp.json();
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(productos));
  } catch (e) {
    console.error(e);
    document.getElementById('solicitudProducts').innerHTML = `<p class="error-msg">${e.message}</p>`;
    productos = [];
  }
}

function renderProducts() {
  const container = document.getElementById('solicitudProducts');
  container.innerHTML = '';
  if (!productos.length) {
    container.innerHTML = '<p>No hay productos disponibles.</p>';
    return;
  }
  productos.forEach(p => {
    const card = document.createElement('article');
    card.className = 'card product-card';
    card.innerHTML = `
      <h3>${p.nombre}</h3>
      <p class="product-sku"><strong>SKU:</strong> ${p.sku}</p>
      <p>${p.detalle}</p>
      <div class="product-meta">
        <span><strong>Precio:</strong> ${formatearPrecio(p.precio)}</span>
        <span><strong>Stock:</strong> <span data-sku="${p.sku}" class="stock">${p.cantidad}</span></span>
      </div>
      <div style="margin-top:10px; display:flex; gap:8px; align-items:center;">
        <input type="number" min="1" value="1" max="${p.cantidad}" style="width:80px;padding:6px;border-radius:6px;" data-sku-input="${p.sku}" />
        <button class="btn add-btn" data-sku-btn="${p.sku}">Añadir</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function attachListeners() {
  document.getElementById('solicitudProducts').addEventListener('click', (e) => {
    const btn = e.target.closest('.add-btn');
    if (!btn) return;
    const sku = btn.dataset.skuBtn;
    const input = document.querySelector(`[data-sku-input="${sku}"]`);
    const qty = Math.max(1, parseInt(input.value || '1', 10));
    addToCart(sku, qty);
  });

  document.getElementById('solicitudCart').addEventListener('click', (e) => {
    if (e.target.matches('.remove-item')) {
      const sku = e.target.dataset.skuRemove;
      removeFromCart(sku);
    }
  });

  document.getElementById('placeOrderBtn').addEventListener('click', placeOrder);
  document.getElementById('sendEmailBtn').addEventListener('click', sendEmail);
  document.getElementById('clearStorageBtn').addEventListener('click', restoreCatalog);
}

function addToCart(sku, qty) {
  const product = productos.find(p => p.sku === sku);
  if (!product) return alert('Producto no encontrado');
  const available = product.cantidad;
  if (qty > available) return alert('Cantidad solicitada mayor al stock disponible');

  const existing = cart.find(i => i.sku === sku);
  if (existing) {
    if (existing.qty + qty > available) return alert('No hay suficiente stock para sumar esa cantidad');
    existing.qty += qty;
  } else {
    cart.push({ sku, nombre: product.nombre, precio: product.precio, qty });
  }
  renderCart();
}

function removeFromCart(sku) {
  cart = cart.filter(i => i.sku !== sku);
  renderCart();
}

function renderCart() {
  const container = document.getElementById('solicitudCart');
  container.innerHTML = '';
  if (!cart.length) {
    container.innerHTML = '<p>No hay items en el pedido.</p>';
    return;
  }
  cart.forEach(item => {
    const c = document.createElement('article');
    c.className = 'card';
    c.innerHTML = `
      <h3>${item.nombre}</h3>
      <p><strong>SKU:</strong> ${item.sku}</p>
      <p><strong>Cantidad:</strong> ${item.qty}</p>
      <p><strong>Subtotal:</strong> ${formatearPrecio(item.precio * item.qty)}</p>
      <div style="margin-top:8px;"><button class="btn remove-item" data-sku-remove="${item.sku}">Quitar</button></div>
    `;
    container.appendChild(c);
  });
}

function saveProductsToStorage() {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(productos));
}

function saveOrderRecord(order) {
  const stored = localStorage.getItem(ORDERS_KEY);
  const arr = stored ? JSON.parse(stored) : [];
  arr.push(order);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(arr));
}

function placeOrder() {
  if (!cart.length) return alert('El pedido está vacío');
  // validate stock again and deduct
  for (const item of cart) {
    const p = productos.find(x => x.sku === item.sku);
    if (!p) return alert('Producto no encontrado: ' + item.sku);
    if (item.qty > p.cantidad) return alert(`Stock insuficiente para ${p.nombre}`);
  }
  // deduct
  cart.forEach(item => {
    const p = productos.find(x => x.sku === item.sku);
    p.cantidad -= item.qty;
  });
  saveProductsToStorage();

  const name = document.getElementById('customerName').value.trim() || 'No indicado';
  const email = document.getElementById('solicitudEmail').value.trim() || '';
  const order = {
    id: Date.now(),
    name,
    email,
    items: cart,
    date: new Date().toISOString()
  };
  saveOrderRecord(order);
  cart = [];
  renderProducts();
  renderCart();
  alert('Pedido realizado correctamente');
}

function sendEmail() {
  if (!cart.length) return alert('El pedido está vacío');
  const name = document.getElementById('customerName').value.trim() || 'No indicado';
  const email = document.getElementById('solicitudEmail').value.trim();
  let body = `Pedido de ${name}%0D%0A%0D%0A`;
  cart.forEach(i => {
    body += `${i.nombre} (SKU: ${i.sku}) x ${i.qty} - ${formatearPrecio(i.precio * i.qty)}%0D%0A`;
  });
  body += `%0D%0ATotal: ${formatearPrecio(cart.reduce((s, it) => s + it.precio * it.qty, 0))}`;
  if (email) {
    // open mailto to specific email
    const subject = encodeURIComponent('Solicitud LukiPao');
    const mailto = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
    window.location.href = mailto;
  } else {
    // open mail client without recipient
    const subject = encodeURIComponent('Solicitud LukiPao');
    const mailto = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = mailto;
  }
}

async function restoreCatalog() {
  if (!confirm('Restaurar catálogo original sobrescribirá las cantidades actuales. Continuar?')) return;
  try {
    const resp = await fetch('data/productos.json');
    if (!resp.ok) throw new Error('No se pudo restaurar catálogo');
    productos = await resp.json();
    saveProductsToStorage();
    renderProducts();
    alert('Catálogo restaurado');
  } catch (e) {
    console.error(e);
    alert('Error al restaurar catálogo');
  }
}

init();