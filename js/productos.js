const STORAGE_KEY = "productos_v1";
let editingSku = null;

//Devuelve los datos iniciales.
async function fetchInitialProductos() {
    try {
        const res = await fetch("data/productos.json");
        if (!res.ok) throw new Error("No se pudo cargar productos");
        const data = await res.json();
        return data;
    } catch (e) {
        console.warn("Carga inicial fallida, usando lista vacía", e);
        return [];
    }
}
//Carga los productos desde el almacenamiento local o desde el archivo JSON inicial.
async function loadProductos() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);

    const initial = await fetchInitialProductos();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
}

function saveProductos(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function formatCurrency(v) {
    return "₡\u00A0" + v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
//Mostrar los productos en la tabla de mantenimiento.
function renderProductos(list) {
    const tbody = document.querySelector("#productosTable tbody");
    tbody.innerHTML = "";
    list.forEach((p) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${p.sku}</td>
            <td>${p.nombre}</td>
            <td>${p.detalle || ""}</td>
            <td class="price">${formatCurrency(p.precio)}</td>
            <td>${p.cantidad}</td>
            <td class="actions-cell">
                <button class="icon-btn action-edit" data-action="edit" data-sku="${p.sku}" title="Editar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 21v-3l11-11 3 3L6 21H3zM16.5 4.5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <button class="icon-btn action-delete" data-action="delete" data-sku="${p.sku}" title="Eliminar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6M10 6V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function findIndexBySku(list, sku) {
    return list.findIndex((x) => x.sku === sku);
}
//Muestra el modal para crear o editar un producto.
function openModal(mode, product) {
    const modal = document.getElementById("productModal");
    const formTitle = document.getElementById("formTitle");
    const form = document.getElementById("productoForm");
    const cancelBtn = document.getElementById("cancelEdit");

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");

    if (mode === "create") {
        form.reset();
        editingSku = null;
        cancelBtn.style.display = "none";
        formTitle.textContent = "Crear producto";
        document.getElementById("formMsg").textContent = "";
    } else if (mode === "edit" && product) {
        document.getElementById("sku").value = product.sku;
        document.getElementById("nombre").value = product.nombre;
        document.getElementById("detalle").value = product.detalle || "";
        document.getElementById("precio").value = product.precio || 0;
        document.getElementById("cantidad").value = product.cantidad || 0;
        editingSku = product.sku;
        cancelBtn.style.display = "inline-block";
        formTitle.textContent = "Editar producto";
        document.getElementById("formMsg").textContent = "";
    }
}
//Cierra el modal de creación, edición del producto y lo oculta visualmente.
function closeModal() {
    const modal = document.getElementById("productModal");
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
}
//Avisos tipo toast para mostrar mensajes de éxito o error.
function showToast(message, type = "success") {
    const toast = document.getElementById("toastNotification");
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast-notification show ${type}`;
    clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(() => {
        toast.className = "toast-notification";
    }, 2800);
}
//Cuando se carga la página.
document.addEventListener("DOMContentLoaded", async () => {
    let productos = await loadProductos();
    renderProductos(productos);
    window.__productos = productos;

    const form = document.getElementById("productoForm");
    const skuInput = document.getElementById("sku");
    const nombreInput = document.getElementById("nombre");
    const detalleInput = document.getElementById("detalle");
    const precioInput = document.getElementById("precio");
    const cantidadInput = document.getElementById("cantidad");
    const formMsg = document.getElementById("formMsg");
    const cancelBtn = document.getElementById("cancelEdit");
    const modalClose = document.getElementById("modalClose");
    const openCreateBtn = document.getElementById("openCreateBtn");

    openCreateBtn.addEventListener("click", () => openModal("create"));
    modalClose.addEventListener("click", closeModal);
    cancelBtn.addEventListener("click", () => {
        form.reset();
        editingSku = null;
        closeModal();
    });
    // Manejo del envío del formulario para crear o editar un producto.
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const sku = skuInput.value.trim();
        const nombre = nombreInput.value.trim();
        if (!sku || !nombre) {
            formMsg.textContent = "SKU y Nombre son obligatorios";
            return;
        }
        const nuevo = {
            sku,
            nombre,
            detalle: detalleInput.value.trim(),
            precio: Number(precioInput.value) || 0,
            cantidad: Number(cantidadInput.value) || 0,
        };

        if (editingSku) {
            const idx = findIndexBySku(productos, editingSku);
            if (idx !== -1) {
                if (editingSku !== sku && findIndexBySku(productos, sku) !== -1) {
                    formMsg.textContent = "El SKU ya existe";
                    return;
                }
                productos[idx] = nuevo;
                saveProductos(productos);
                renderProductos(productos);
                window.__productos = productos;
                form.reset();
                editingSku = null;
                showToast("Producto actualizado con éxito.");
                closeModal();
            }
        } else {
            if (findIndexBySku(productos, sku) !== -1) {
                formMsg.textContent = "El SKU ya existe";
                return;
            }
            productos.push(nuevo);
            saveProductos(productos);
            renderProductos(productos);
            window.__productos = productos;
            form.reset();
            formMsg.textContent = "Producto creado";
            showToast("Producto creado con éxito.");
            closeModal();
        }
    });
    // Manejo de eventos de edición y eliminación en la tabla de productos por medio de botones.
    document.querySelector("#productosTable tbody")
            .addEventListener("click", (e) => {
            const btn = e.target.closest("button");
            if (!btn) return;
            if (btn.classList.contains("action-edit")) {
                const sku = btn.dataset.sku;
                const idx = findIndexBySku(productos, sku);
                if (idx === -1) return;
                openModal("edit", productos[idx]);
                return;
            }
            if (btn.classList.contains("action-delete")) {
                const sku = btn.dataset.sku;
                if (!confirm("¿Está seguro de eliminar este producto?")) return;
                productos = productos.filter((x) => x.sku !== sku);
                saveProductos(productos);
                renderProductos(productos);
                window.__productos = productos;
                showToast("Producto eliminado con éxito.");
                return;
            }
        });

    // Filtro de productos en la tabla de mantenimiento
    document.getElementById("filterProducts").addEventListener("input", (e) => {
        const q = e.target.value.trim().toLowerCase();
        const all = window.__productos || [];
        if (!q) return renderProductos(all);
        const filtered = all.filter(
            (p) =>
                (p.nombre || "").toLowerCase().includes(q) ||
                (p.sku || "").toLowerCase().includes(q),
        );
        renderProductos(filtered);
    });
});
