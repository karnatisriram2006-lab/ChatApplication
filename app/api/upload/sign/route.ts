import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { logger } from '@/lib/logger';

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

export async function GET() {
    try {
        const timestamp = Math.round(new Date().getTime() / 1000);

        const paramsToSign = {
            timestamp: timestamp,
        };

        const signature = cloudinary.utils.api_sign_request(
            paramsToSign,
            process.env.CLOUDINARY_API_SECRET!
        );

        return NextResponse.json({
            timestamp,
            signature,
            apiKey: process.env.CLOUDINARY_API_KEY,
            cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        });
    } catch (error: unknown) {
        logger.error('Error generating Cloudinary signature:', error);
        return NextResponse.json(
            { error: 'Failed to authenticate upload request' },
            { status: 500 }
        );
    }
}
