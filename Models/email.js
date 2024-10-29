const ElasticEmail = require('@elasticemail/elasticemail-client');
const defaultClient = ElasticEmail.ApiClient.instance;
const apikey = defaultClient.authentications['apikey'];
apikey.apiKey =
    'BB92C606AE9A11E6ED69415E75A91D77775CEDA058B03CBD8F80D0065D822E529078805AC4CB8619DF0953F4A84B64C1';
const api = new ElasticEmail.EmailsApi();

const emailTitles = [
    'Đang chuẩn bị hàng',
    'Đã gửi hàng đi',
    'Đang vận chuyển tới bạn',
    'Đã giao hàng'
];

const emailBody = (data) => `
<div style="font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif; color: #333; line-height: 1.6;">
    <h1 style="color: #1976D2; font-weight: 400;">Xin chào ${data.name_order}</h1>
    <p><strong>Số điện thoại:</strong> 0${data.phone}</p>
    <p><strong>Địa chỉ:</strong> ${data.address}</p>
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
            <tr>
                <th style="border: 1px solid #ddd; padding: 12px; text-align: center; background-color: #f5f5f5;">Tên Sản Phẩm</th>
                <th style="border: 1px solid #ddd; padding: 12px; text-align: center; background-color: #f5f5f5;">Hình Ảnh</th>
                <th style="border: 1px solid #ddd; padding: 12px; text-align: center; background-color: #f5f5f5;">Giá</th>
                <th style="border: 1px solid #ddd; padding: 12px; text-align: center; background-color: #f5f5f5;">Số Lượng</th>
                <th style="border: 1px solid #ddd; padding: 12px; text-align: center; background-color: #f5f5f5;">Thành Tiền</th>
            </tr>
        </thead>
        <tbody>
            ${data.list_cart.map(obj => `
            <tr>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">${obj.name_product}</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">
                    <img style="width: 100px;" src="${obj.image}" alt="product"/>
                </td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">${obj.price_product}</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">${obj.quantity}</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">${obj.quantity * obj.price_product}</td>
            </tr>`).join('')}
        </tbody>
    </table>
    <div style="margin-top: 20px; padding: 12px; background-color: #f5f5f5; border: 1px solid #ddd;">
        <h3 style="color: #D32F2F;">Tổng thanh toán: ${data.total} VND</h3>
        <h3 style="color: #1976D2;">Cảm ơn bạn đã tin tưởng và ủng hộ chúng tôi!</h3>
    </div>
</div>
`;

const email = (data, subject) => {
    return ElasticEmail.EmailMessageData.constructFromObject({
        Recipients: [new ElasticEmail.EmailRecipient(data.email)],
        Content: {
            Body: [
                ElasticEmail.BodyPart.constructFromObject({
                    ContentType: 'HTML',
                    charset: 'utf-8',
                    Content: emailBody(data),
                }),
            ],
            Subject: subject,
            From: 'phuchu199749@gmail.com',
        },
    });
};

const sendEmail = async (data) => {
    try {
        let subject = 'Xác nhận đơn hàng';
        if (data.accepted) {
            if (data.status !== 0) {
                subject = emailTitles[data.status];
            }
            const emailData = email(data, subject);
            const response = await api.emailsPost(emailData);
            console.log('Email sent successfully:', response);
        } else {
            console.log('Order not accepted, no email sent.');
        }
    } catch (error) {
        console.error('Error sending email:', error.response ? error.response.body : error.message);
    }
};

module.exports = {
    sendEmail,
};