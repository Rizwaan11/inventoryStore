import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Medicine from '@/models/Medicine';

export async function GET(req) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    // Only name search is done server-side for efficiency.
    // Status, category, and expiry filters are applied client-side
    // (dataset is small for a local shop, so this is instant).
    const query = search
      ? { $or: [
          { name: { $regex: search, $options: 'i' } },
          { formula: { $regex: search, $options: 'i' } },
        ]}
      : {};

    const medicines = await Medicine.find(query).sort({ createdAt: -1 });
    return NextResponse.json(medicines);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch medicines' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const medicine = await Medicine.create(body);
    return NextResponse.json(medicine, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add medicine', details: error.message }, { status: 400 });
  }
}
