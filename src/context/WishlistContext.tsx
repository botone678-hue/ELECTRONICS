import React, { createContext, useContext, useEffect, useState } from 'react';
import { Product } from '../types';
import { useAuth } from './AuthContext';

interface WishlistContextType {
  wishlistIds: string[];
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (product: Product) => void;
  wishlistCount: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);
const GUEST_WISHLIST_KEY = 'megacity_guest_wishlist';

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('megacity_token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function readWishlist(): Promise<string[]> {
  const response = await fetch('/api/wishlist', { headers: authHeaders() });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to load wishlist.');
  return Array.isArray(data.wishlistIds) ? data.wishlistIds : [];
}

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    const syncWishlist = async () => {
      if (!user) {
        try {
          const saved = localStorage.getItem(GUEST_WISHLIST_KEY);
          setWishlistIds(saved ? JSON.parse(saved) : []);
        } catch {
          setWishlistIds([]);
        }
        return;
      }

      try {
        const guestSaved = localStorage.getItem(GUEST_WISHLIST_KEY);
        const guestIds: string[] = guestSaved ? JSON.parse(guestSaved) : [];
        const serverIds = await readWishlist();
        const missing = guestIds.filter((id) => !serverIds.includes(id));

        if (missing.length > 0) {
          await Promise.all(
            missing.map((productId) =>
              fetch(`/api/wishlist/${encodeURIComponent(productId)}`, {
                method: 'POST',
                headers: authHeaders()
              })
            )
          );
        }

        localStorage.removeItem(GUEST_WISHLIST_KEY);
        const merged = [...new Set([...serverIds, ...missing])];
        if (!cancelled) setWishlistIds(merged);
      } catch (error) {
        console.error('[wishlist] Failed to sync wishlist:', error);
        if (!cancelled) setWishlistIds([]);
      }
    };

    void syncWishlist();
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      try {
        localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(wishlistIds));
      } catch {
        // Ignore storage failures; the in-memory guest wishlist remains usable.
      }
    }
  }, [wishlistIds, user?.id]);

  const isInWishlist = (productId: string) => wishlistIds.includes(productId);

  const toggleWishlist = (product: Product) => {
    const removing = wishlistIds.includes(product.id);
    const next = removing
      ? wishlistIds.filter((id) => id !== product.id)
      : [...wishlistIds, product.id];

    setWishlistIds(next);

    if (!user) return;

    void (async () => {
      try {
        const response = await fetch(`/api/wishlist/${encodeURIComponent(product.id)}`, {
          method: removing ? 'DELETE' : 'POST',
          headers: authHeaders()
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Wishlist update failed.');
      } catch (error) {
        console.error('[wishlist] Failed to update wishlist:', error);
        setWishlistIds(wishlistIds);
      }
    })();
  };

  return (
    <WishlistContext.Provider value={{ wishlistIds, isInWishlist, toggleWishlist, wishlistCount: wishlistIds.length }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within a WishlistProvider');
  return context;
};
