import { Router, Response } from 'express';
import { db } from '../db';
import { optionalAuth, AuthRequest } from '../auth';

export const productRouter = Router();

// Get Categories
productRouter.get('/categories', (_req, res) => {
  const categories = db.getCategories();
  res.json({ categories });
});

// Get Category by Slug
productRouter.get('/categories/:slug', (req, res) => {
  const cat = db.getCategoryBySlug(req.params.slug);
  if (!cat) {
    return res.status(404).json({ error: 'Category not found.' });
  }
  res.json({ category: cat });
});

// List Products with multi-facet filters & search
productRouter.get('/products', (req, res) => {
  try {
    const {
      categoryId,
      subcategory,
      brand,
      minPrice,
      maxPrice,
      featured,
      isHotDeal,
      inStockOnly,
      search,
      sort,
      limit,
      offset
    } = req.query;

    const result = db.getProducts({
      categoryId: categoryId as string,
      subcategory: subcategory as string,
      brand: brand as string,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      featured: featured === 'true' ? true : undefined,
      isHotDeal: isHotDeal === 'true' ? true : undefined,
      inStockOnly: inStockOnly === 'true' ? true : undefined,
      search: search as string,
      sort: sort as any,
      limit: limit ? Number(limit) : 100,
      offset: offset ? Number(offset) : 0
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching products' });
  }
});

// Get Single Product by Slug or ID
productRouter.get('/products/:identifier', (req, res) => {
  const { identifier } = req.params;
  let product = db.getProductBySlug(identifier);
  if (!product) {
    product = db.getProductById(identifier);
  }

  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  // Get related products from same category
  const related = db
    .getProducts({ categoryId: product.categoryId, limit: 6 })
    .products.filter((p) => p.id !== product!.id);

  // Get reviews
  const reviews = db.getReviews(product.id);

  res.json({ product, related, reviews });
});

// Submit a Customer Review
productRouter.post('/products/:id/reviews', optionalAuth, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { customerName, rating, comment } = req.body;

    const product = db.getProductById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5 stars.' });
    }

    if (!comment || comment.trim().length < 5) {
      return res.status(400).json({ error: 'Please write a review comment of at least 5 characters.' });
    }

    const review = db.addReview({
      productId: id,
      customerId: req.user?.id,
      customerName: customerName ? customerName.trim() : req.user?.name || 'Customer',
      rating: Number(rating),
      comment: comment.trim()
    });

    res.status(201).json({ message: 'Thank you! Review submitted successfully.', review });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Review error' });
  }
});

// Delivery Zones
productRouter.get('/delivery-zones', (_req, res) => {
  res.json({ zones: db.getDeliveryZones().filter((z) => z.active) });
});

// Store Settings (Public view)
productRouter.get('/settings', (_req, res) => {
  res.json({ settings: db.getSettings() });
});
