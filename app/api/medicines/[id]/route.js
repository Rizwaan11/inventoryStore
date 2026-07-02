import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Medicine from '@/models/Medicine';

export async function PUT(req, { params }) {
  try {
    await connectToDatabase();
    // params is a Promise in Next.js App Router — must be awaited
    const { id } = await params;
    const body = await req.json();

    const medicine = await Medicine.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!medicine) {
      return NextResponse.json({ error: 'Medicine not found' }, { status: 404 });
    }

    return NextResponse.json(medicine);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update medicine', details: error.message },
      { status: 400 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectToDatabase();
    // params is a Promise in Next.js App Router — must be awaited
    const { id } = await params;

    const medicine = await Medicine.findByIdAndDelete(id);

    if (!medicine) {
      return NextResponse.json({ error: 'Medicine not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete medicine', details: error.message },
      { status: 400 }
    );
  }
}
