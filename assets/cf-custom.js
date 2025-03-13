// JavaScript
window.addEventListener('scroll', () => {
  const header = document.querySelector('header');
  if (window.scrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
});

// Add Event Listener to Cart Buttons
const cartButtons = document.querySelectorAll("[cf-cart-button]");

if (cartButtons.length > 0) {
  cartButtons.forEach((button) => {
    button.addEventListener("click", async (e) => {
      e.preventDefault();
      const variantId = button.dataset.id;
      if (variantId) {
        await cartAdd(variantId);
      } else {
        console.error("No variant ID found on the button.");
      }
    });
  });
}

const updateCartQuantity = async (key, quantity) => {
  try {
    const response = await fetch(
      `${window.Shopify.routes.root}cart/update.js`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: { [key]: quantity } }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update cart quantity: ${response.statusText}`);
    }
    console.log("Cart quantity updated successfully.");

    return await response.json();
  } catch (error) {
    console.error("An error occurred while updating cart quantity:", error);
    throw error; // Re-throw the error to handle it upstream if needed
  }
};

const updateQuantity = () => {
  const drawer = document.querySelector("#CartDrawerForm");

  if (!drawer) {
    console.error("Cart drawer not found.");
    return;
  }

  drawer.addEventListener("click", async (e) => {
    try {
      const isMinus = e.target.closest(".js-qty__adjust--minus");
      const isPlus = e.target.closest(".js-qty__adjust--plus");
      if (!isMinus && !isPlus) return;

      const item = e.target.closest(".cart__item");
      const input = item.querySelector('[name="updates[]"]');
      const key = item.dataset.key;

      const wrapper = item.querySelector(".js-qty__wrapper");
      wrapper.classList.add("is-loading");

      const currentQty = +input.value;
      const newQty = Math.max(currentQty + (isPlus ? 1 : -1), 0); // Prevent negative quantities

      await updateCartQuantity(key, newQty);
      await getCartDrawerData(); // Ensure this is defined elsewhere in your code
      AOS.refreshHard();
    } catch (error) {
      console.error("An error occurred while updating the quantity:", error);
    }
  });
};

const closeButton = () => {
  const cartDrawer = document.querySelector("#CartDrawer");
  const removeButton = document.querySelector(
    "#CartDrawerForm .js-drawer-close"
  );

  if (!cartDrawer) {
    console.error("Cart drawer element not found.");
    return;
  }

  // Close drawer when clicking on the main content
  window.addEventListener("click", (e) => {
    if (
      e.target.id === "MainContent" &&
      cartDrawer.classList.contains("drawer--is-open")
    ) {
      cartDrawer.classList.remove("drawer--is-open");
      document.documentElement.classList.remove(
        "js-drawer-open",
        "lock-scroll"
      );
    }
  });

  // Close drawer when clicking the close button
  if (removeButton) {
    removeButton.addEventListener("click", () => {
      cartDrawer.classList.remove("drawer--is-open");
      document.documentElement.classList.remove(
        "js-drawer-open",
        "lock-scroll"
      );
    });
  } else {
    console.error("Close button not found.");
  }
};

// Add Item to Cart
const cartAdd = async (id) => {
  try {
    loader(true);

    const formData = {
      items: [
        {
          id: Number(id),
          quantity: 1,
        },
      ],
    };

    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    };

    const response = await fetch(
      `${window.Shopify.routes.root}cart/add.js`,
      options
    );

    if (!response.ok) {
      console.error("Failed to add item to the cart:", response.statusText);
      return;
    }

    const data = await response.json();
    await getCartDrawerData();
    openCart();
    closeButton();
    updateQuantity();
    AOS.refreshHard();
  } catch (error) {
    console.error(
      "An error occurred while adding the item to the cart:",
      error
    );
  } finally {
    AOS.refreshHard();
    loader(false);
  }
};

// Fetch and Update Cart Drawer Data
const getCartDrawerData = async () => {
  try {
    const response = await theme.cart.getCartProductMarkup();
    const parser = new DOMParser();
    const updatedDocument = parser.parseFromString(response, "text/html");

    const drawerInnerSelector = ".drawer__inner .drawer__scrollable div[data-products]";
    const currentDrawerTable = document.querySelector(drawerInnerSelector);
    const updatedDrawerTable = updatedDocument.body;
    const subtotal = updatedDocument.body.querySelector(".cart__items").dataset.cartSubtotal;
    
    // Update Cart Items Table
    if (currentDrawerTable && updatedDrawerTable) {
      currentDrawerTable.innerHTML = updatedDrawerTable.innerHTML;

      if (window.AOS) {
        AOS.refresh();
      } else {
        console.error("AOS library is not loaded.");
      }
    }

    // Update Subtotal
    const drawerSubtotal = document.querySelector(
      ".drawer__footer [data-subtotal]"
    );
    if (drawerSubtotal) {
      drawerSubtotal.innerHTML = theme.Currency.formatMoney(
        subtotal,
        theme.settings.moneyFormat
      );
    }


    const drawer = document.querySelector("#CartDrawer")
    drawer.classList.remove('is-empty')
    
    
  } catch (error) {
    console.error("An error occurred while updating the cart drawer:", error);
  }
};

// Open Cart Drawer
const openCart = () => {
  document.documentElement.classList.add("js-drawer-open", "lock-scroll");

  const cartDrawer = document.querySelector("#CartDrawer");
  if (cartDrawer) {
    cartDrawer.classList.add("drawer--is-open");
  } else {
    console.error("Cart drawer element not found.");
  }
};

// Show/Hide Loader
const loader = (state) => {
  const loaderElement = document.querySelector(".loader-wrap");

  if (state) {
    if (!loaderElement) {
      const loaderMarkup =
        '<div class="loader-wrap"><div class="loader"></div></div>';
      document.body.insertAdjacentHTML("afterbegin", loaderMarkup);
    }
  } else {
    loaderElement?.remove();
  }
};

const closeSidebarButton = document.querySelector("[data-close-button]");
const subcollectionButton = document.querySelector("[data-subcollection-button]");

if (closeSidebarButton) {
  closeSidebarButton.addEventListener("click", () => {
    toggle("remove");
  });
}

if (subcollectionButton) {
  subcollectionButton.addEventListener("click", () => {
    toggle("add");
  });
}

const toggle = (state) => {
  const sidebar = document.querySelector(".cf-subcollection-sidebar");
  
  if (sidebar) {
    if (state === "add") {
      document.body.classList.add("cf-overflow-hidden");
      sidebar.classList.add("is-active");
    } else if (state === "remove") {
      document.body.classList.remove("cf-overflow-hidden");
      sidebar.classList.remove("is-active");
    }
  } else {
    console.warn("Sidebar element not found.");
  }
};
