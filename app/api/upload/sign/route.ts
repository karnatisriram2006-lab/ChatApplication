import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

export async function GET() {
    try {
        const timestamp = Math.round(new Date().getTime() / 1000);

        // Any advanced parameters (like folder, tags, etc) would go in this object
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
    } catch (error: any) {
        console.error('Error generating Cloudinary signature:', error);
        return NextResponse.json(
            { error: 'Failed to authenticate upload request' },
            { status: 500 }
        );
    }
}
