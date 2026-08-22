import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem, DeliveryZone } from '../types';
import { api } from '../services/api';

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  deliveryZones: DeliveryZone[];
  selectedZone: DeliveryZone | null;
  deliveryFee: number;
  total: number;
  isCartDrawerOpen: boolean;
  addToCart: (product: Product, quantity?: number) => void;
  buyNow: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: string, delta: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  setSelectedZone: (zone: DeliveryZone) => void;
  setIsCartDrawerOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode; onNavigateToCheckout?: () => void }> = ({
  children,
  onNavigateToCheckout
}) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('megacity_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [selectedZone, setSelectedZoneState] = useState<DeliveryZone | null>(null);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  useEffect(() => {
    async function fetchZones() {
      try {
        const { zones } = await api.getDeliveryZones();
        setDeliveryZones(zones);
        if (zones.length > 0 && !selectedZone) {
          setSelectedZoneState(zones[0]);
        }
      } catch (e) {
        console.error('Failed to load delivery zones:', e);
      }
    }
    fetchZones();
  }, []);

  useEffect(() => {
    localStorage.setItem('megacity_cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (product: Product, quantity = 1) => {
    if (product.stockQuantity <= 0) return;

    setItems((prev) => {
      const existing = prev.find((it) => it.product.id === product.id);
      if (existing) {
        const newQty = Math.min(existing.quantity + quantity, product.stockQuantity);
        return prev.map((it) => (it.product.id === product.id ? { ...it, quantity: newQty } : it));
      }
      return [...prev, { product, quantity: Math.min(quantity, product.stockQuantity) }];
    });
    setIsCartDrawerOpen(true);
  };

  const buyNow = (product: Product, quantity = 1) => {
    addToCart(product, quantity);
    setIsCartDrawerOpen(false);
    if (onNavigateToCheckout) {
      onNavigateToCheckout();
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((it) => {
          if (it.product.id === productId) {
            const nextQty = it.quantity + delta;
            if (nextQty <= 0) return null;
            if (nextQty > it.product.stockQuantity) return it;
            return { ...it, quantity: nextQty };
          }
          return it;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const setQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) =>
      prev.map((it) => {
        if (it.product.id === productId) {
          const validQty = Math.min(quantity, it.product.stockQuantity);
          return { ...it, quantity: validQty };
        }
        return it;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setItems((prev) => prev.filter((it) => it.product.id !== productId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const setSelectedZone = (zone: DeliveryZone) => {
    setSelectedZoneState(zone);
  };

  const itemCount = items.reduce((sum, it) => sum + it.quantity, 0);
  const subtotal = items.reduce((sum, it) => sum + it.product.price * it.quantity, 0);

  let deliveryFee = selectedZone ? selectedZone.fee : 0;
  if (selectedZone?.freeThreshold && subtotal >= selectedZone.freeThreshold) {
    deliveryFee = 0;
  }

  const total = subtotal + deliveryFee;

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        deliveryZones,
        selectedZone,
        deliveryFee,
        total,
        isCartDrawerOpen,
        addToCart,
        buyNow,
        updateQuantity,
        setQuantity,
        removeFromCart,
        clearCart,
        setSelectedZone,
        setIsCartDrawerOpen
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
