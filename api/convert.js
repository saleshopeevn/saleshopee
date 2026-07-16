const crypto = require('crypto');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { originalLink } = req.body;
    if (!originalLink) {
        return res.status(400).json({ message: 'Thiếu link Shopee gốc' });
    }

    // 🔴 LƯU Ý: Tạm thời giữ nguyên 2 dòng này, chúng ta sẽ điền khóa bảo mật của bạn ở bước sau
    const APP_ID = process.env.SHOPEE_APP_ID || "CHƯA_CÓ";
    const APP_SECRET = process.env.SHOPEE_APP_SECRET || "CHƯA_CÓ";

    if (APP_ID === "CHƯA_CÓ") {
        return res.status(500).json({ success: false, message: 'Chưa cấu hình API Shopee' });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const graphqlQuery = {
        query: `mutation {
            generateShortLink(input: {
                originUrl: "${originalLink}",
                subIds: ["fb_exclusive"]
            }) {
                shortLink
            }
        }`
    };

    const bodyStr = JSON.stringify(graphqlQuery);
    const factor = APP_ID + timestamp + bodyStr + APP_SECRET;
    const signature = crypto.createHash('sha256').update(factor).digest('hex');

    try {
        const response = await fetch('https://open-api.affiliate.shopee.vn/api/v1/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `SHA256 Credential=${APP_ID}, Timestamp=${timestamp}, Signature=${signature}`
            },
            body: bodyStr
        });

        const resData = await response.json();
        
        if (resData.data && resData.data.generateShortLink) {
            let affLink = resData.data.generateShortLink.shortLink;
            let finalLink = new URL(affLink);
            finalLink.searchParams.set('utm_source', 'facebook');
            finalLink.searchParams.set('utm_medium', 'cpc');
            finalLink.searchParams.set('utm_campaign', 'fb_exclusive_voucher');

            return res.status(200).json({ success: true, link: finalLink.href });
        } else {
            return res.status(500).json({ success: false, message: 'Shopee từ chối tạo link', details: resData });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}
