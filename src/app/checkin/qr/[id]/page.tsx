"use client";
import { useParams } from 'next/navigation';
import CheckinPage from '../../page';

export default function CheckinQRPage() {
  const params = useParams();
  const id = params.id as string;

  // Render the main check-in page, passing the QR code from the URL
  return <CheckinPage qrCode={id} />;
} 