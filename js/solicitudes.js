// Inicializar EmailJS
emailjs.init({ publicKey: 'JYJ7-RU_9gIYtj_tp' });

const PRODUCTS_KEY = 'productos_v1';
const ORDERS_KEY = 'pedidos_local';

// Configuración EmailJS — reemplaza con tus valores del dashboard de emailjs.com
const EMAILJS_SERVICE_ID  = 'service_nvzg2hu';   // ← ej: 'service_abc123'
const EMAILJS_TEMPLATE_ID = 'template_q7qxtll';  // ← ej: 'template_xyz456'
const CORREO_EMPRESA      = 'alimentoslukipao@gmail.com'; // ← Correo por defecto que recibe copia
let productos = [];
let cart = [];

function formatearPrecio(valor) {
  return `₡ ${valor.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} `;
}

// Inicializar autenticación y cargar datos
async function init() {
  try {
    requireAuth(['admin', 'cliente']);
    await loadProducts();
    populateProductSelect();
    renderOrderTable();
    attachListeners();
    console.log('Página de solicitudes iniciada correctamente');
  } catch (error) {
    console.error('Error durante la inicialización:', error);
    showNotification('Error al cargar la página', 'error');
  }
}

// Escuchar cambios en el almacenamiento local
window.addEventListener('storage', handleStorageUpdate);

function handleStorageUpdate(event) {
  if (event.key === PRODUCTS_KEY) {
    console.log('Productos actualizados en otro tab/ventana');
    loadProducts().then(() => populateProductSelect());
  }
}

// Cargar productos desde localStorage o fetch
async function loadProducts() {
  try {
    const cached = localStorage.getItem(PRODUCTS_KEY);
    if (cached) {
      productos = JSON.parse(cached);
      console.log('Productos cargados desde caché:', productos.length);
      return;
    }

    const response = await fetch('data/productos.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    productos = await response.json();
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(productos));
    console.log('Productos cargados desde archivo:', productos.length);
  } catch (error) {
    console.error('Error al cargar productos:', error);
    productos = [];
  }
}

// Llenar el dropdown de productos
function populateProductSelect() {
  const select = document.getElementById('productSelect');
  if (!select) {
    console.error('Elemento productSelect no encontrado');
    return;
  }

  // Limpiar opciones excepto la primera
  while (select.options.length > 1) {
    select.remove(1);
  }

  productos.forEach(product => {
    const option = document.createElement('option');
    option.value = product.sku;
    option.textContent = `${product.nombre}`;
    option.dataset.stock = product.cantidad;
    option.dataset.nombre = product.nombre;
    option.dataset.precio = product.precio;
    select.appendChild(option);
  });

  console.log('Dropdown poblado con', productos.length, 'productos');
}

// Adjuntar listeners a los elementos del formulario
function attachListeners() {
  const productSelect = document.getElementById('productSelect');
  const quantityInput = document.getElementById('productQuantity');
  const addBtn = document.getElementById('addProductBtn');
  const placeOrderBtn = document.getElementById('placeOrderBtn');
  const clearCartBtn = document.getElementById('clearCartBtn');
  const orderTableBody = document.getElementById('orderTableBody');

  // Actualizar información de stock
  if (productSelect) {
    productSelect.addEventListener('change', () => {
      const selectedOption = productSelect.options[productSelect.selectedIndex];
      const stockInfo = document.getElementById('stockInfo');
      
      if (selectedOption.value) {
        const stock = selectedOption.dataset.stock;
        stockInfo.textContent = `Stock disponible: ${stock} unidades`;
        if (quantityInput) quantityInput.max = stock;
      } else {
        stockInfo.textContent = '';
        if (quantityInput) quantityInput.max = 1;
      }
    });
  }

  // Agregar producto al carrito
  if (addBtn) {
    addBtn.addEventListener('click', addProductToCart);
  }

  // Eliminar líneas del pedido
  if (orderTableBody) {
    orderTableBody.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-delete')) {
        const sku = e.target.dataset.sku;
        removeLineFromCart(sku);
      }
    });
  }

  // Realizar pedido
  if (placeOrderBtn) {
    placeOrderBtn.addEventListener('click', placeOrder);
  }

  // Limpiar carrito
  if (clearCartBtn) {
    clearCartBtn.addEventListener('click', () => {
      if (confirm('¿Deseas limpiar el pedido?')) {
        cart = [];
        renderOrderTable();
        showNotification('Pedido limpiado', 'success');
      }
    });
  }
}

// Agregar producto al carrito
function addProductToCart() {
  const productSelect = document.getElementById('productSelect');
  const quantityInput = document.getElementById('productQuantity');

  if (!productSelect || !quantityInput) {
    showNotification('Error: Elementos del formulario no encontrados', 'error');
    return;
  }

  const sku = productSelect.value;
  const quantity = parseInt(quantityInput.value) || 1;

  if (!sku) {
    showNotification('Por favor selecciona un producto', 'error');
    return;
  }

  const product = productos.find(p => p.sku === sku);
  if (!product) {
    showNotification('Producto no encontrado', 'error');
    return;
  }

  if (quantity > product.cantidad) {
    showNotification(`No hay suficiente stock. Disponible: ${product.cantidad}`, 'error');
    return;
  }

  // Buscar si el producto ya está en el carrito
  const existingItem = cart.find(item => item.sku === sku);
  if (existingItem) {
    if (existingItem.qty + quantity > product.cantidad) {
      showNotification(`No hay suficiente stock para más unidades. Disponible: ${product.cantidad}`, 'error');
      return;
    }
    existingItem.qty += quantity;
  } else {
    cart.push({
      sku,
      nombre: product.nombre,
      precio: product.precio,
      qty: quantity
    });
  }

  renderOrderTable();
  quantityInput.value = 1;
  showNotification(`${product.nombre} agregado al pedido`, 'success');
}

// Eliminar línea del carrito
function removeLineFromCart(sku) {
  const index = cart.findIndex(item => item.sku === sku);
  if (index > -1) {
    const product = cart[index];
    cart.splice(index, 1);
    renderOrderTable();
    showNotification(`${product.nombre} removido del pedido`, 'success');
  }
}

// Renderizar tabla de pedido
function renderOrderTable() {
  const emptyMessage = document.getElementById('emptyCartMessage');
  const table = document.getElementById('orderTable');
  const tableBody = document.getElementById('orderTableBody');
  const totalAmount = document.getElementById('totalAmount');

  if (!tableBody || !table || !emptyMessage || !totalAmount) {
    console.error('Elementos de tabla no encontrados');
    return;
  }

  // Limpiar tabla
  tableBody.innerHTML = '';

  if (cart.length === 0) {
    emptyMessage.style.display = 'block';
    table.style.display = 'none';
    totalAmount.style.display = 'none';
    return;
  }

  emptyMessage.style.display = 'none';
  table.style.display = 'table';
  totalAmount.style.display = 'block';

  let total = 0;

  cart.forEach(item => {
    const subtotal = item.precio * item.qty;
    total += subtotal;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.sku}</td>
      <td>${item.nombre}</td>
      <td>${formatearPrecio(item.precio)}</td>
      <td>${item.qty}</td>
      <td>${formatearPrecio(subtotal)}</td>
      <td><button class="btn-delete" data-sku="${item.sku}">Eliminar</button></td>
    `;
    tableBody.appendChild(row);
  });

  totalAmount.innerHTML = `<strong>Total del Pedido: ${formatearPrecio(total)}</strong>`;
}

// Validar datos del cliente
function validateCustomerData() {
  const name = document.getElementById('customerName').value.trim();
  const lastName = document.getElementById('customerLastName').value.trim();
  const cedula = document.getElementById('customerCedula').value.trim();
  const phone = document.getElementById('customerPhone').value.trim();
  const address = document.getElementById('customerAddress').value.trim();
  const email = document.getElementById('customerEmail').value.trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!name) {
    showNotification('El nombre es requerido', 'error');
    return false;
  }
  if (!lastName) {
    showNotification('Los apellidos son requeridos', 'error');
    return false;
  }
  if (!cedula) {
    showNotification('La cédula es requerida', 'error');
    return false;
  }
  if (!phone) {
    showNotification('El teléfono es requerido', 'error');
    return false;
  }
  if (!address) {
    showNotification('La dirección es requerida', 'error');
    return false;
  }
  if (!email) {
    showNotification('El correo es requerido', 'error');
    return false;
  }
  if (!emailRegex.test(email)) {
    showNotification('El correo electrónico no es válido', 'error');
    return false;
  }

  return true;
}

// Guardar productos al almacenamiento
function saveProductsToStorage() {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(productos));
}

// Guardar registro de pedido
function saveOrderRecord(order) {
  const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
  orders.push(order);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

// Realizar pedido
function placeOrder() {
  if (cart.length === 0) {
    showNotification('El carrito está vacío', 'error');
    return;
  }

  if (!validateCustomerData()) {
    return;
  }

  // Verificar stock nuevamente
  for (const item of cart) {
    const product = productos.find(p => p.sku === item.sku);
    if (!product || item.qty > product.cantidad) {
      showNotification(`Stock insuficiente para ${item.nombre}`, 'error');
      return;
    }
  }

  // Deducir del stock
  cart.forEach(item => {
    const product = productos.find(p => p.sku === item.sku);
    if (product) {
      product.cantidad -= item.qty;
    }
  });

  // Guardar productos actualizados
  saveProductsToStorage();

  // Calcular total
  const total = cart.reduce((sum, item) => sum + (item.precio * item.qty), 0);

  // Crear objeto de pedido
  const order = {
    id: Date.now(),
    customer: {
      name: document.getElementById('customerName').value.trim(),
      lastName: document.getElementById('customerLastName').value.trim(),
      cedula: document.getElementById('customerCedula').value.trim(),
      phone: document.getElementById('customerPhone').value.trim(),
      address: document.getElementById('customerAddress').value.trim(),
      email: document.getElementById('customerEmail').value.trim()
    },
    items: [...cart],
    date: new Date().toISOString(),
    total: total
  };

  // Guardar pedido
  saveOrderRecord(order);

  // Enviar correos
  sendOrderEmail(order);

  // Limpiar formulario y carrito
  document.getElementById('customerName').value = '';
  document.getElementById('customerLastName').value = '';
  document.getElementById('customerCedula').value = '';
  document.getElementById('customerPhone').value = '';
  document.getElementById('customerAddress').value = '';
  document.getElementById('customerEmail').value = '';
  
  cart = [];
  renderOrderTable();
  populateProductSelect();

  showNotification(`Pedido realizado exitosamente. ID: ${order.id}`, 'success');
}

// Enviar correo del pedido al cliente y a la empresa
function sendOrderEmail(order) {
  const itemsHtml = order.items.map(item =>
    `• ${item.nombre}\n  SKU: ${item.sku} | Cantidad: ${item.qty} | Subtotal: ${formatearPrecio(item.precio * item.qty)}`
  ).join('\n\n');

  const templateParams = {
    order_id:         order.id,
    customer_name:    `${order.customer.name} ${order.customer.lastName}`,
    customer_cedula:  order.customer.cedula,
    customer_phone:   order.customer.phone,
    customer_address: order.customer.address,
    customer_email:   order.customer.email,
    order_items:      itemsHtml,
    order_total:      formatearPrecio(order.total),
    order_date:       new Date(order.date).toLocaleString('es-CR'),
    email:            order.customer.email,
    reply_to:         order.customer.email,
    to_email:         order.customer.email,
    cc_email:         CORREO_EMPRESA
  };

  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
    .then(() => {
      console.log('Correo enviado correctamente');
      showNotification('Correo de confirmación enviado', 'success');
    })
    .catch(error => {
      console.error('Error al enviar correo:', error);
      showNotification('Pedido guardado, pero no se pudo enviar el correo', 'error');
    });
}

// Mostrar notificaciones
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `toast-notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  // Mostrar notificación
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  // Ocultar y eliminar notificación
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);

