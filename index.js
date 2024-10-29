const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./Models/User');
const mongoose = require('mongoose');
const multer = require('multer');
const ImageModel = require('./Models/image');
const CategoriesModel = require('./Models/categories');
const ProductsModel = require('./Models/products');
const CartModel = require('./Models/cart');
const OrderModel = require('./Models/order');
const SlideMiddleModel = require('./Models/slideMiddle');
const helpDelete = require('./util/delete');
const AuthLogin = require('./middleware/authLogin');
const bodyParser = require('body-parser');
const EmailModel = require('./Models/email');
const { catchDeleteFile } = require('./util/catchDeleteFile');
const { deleteFile } = require('./util/firebaseHandle');
const { sendEmail } = require('./Models/email');

mongoose
    .connect(process.env.MONGOOSE_URL)
    .then(() => {
        console.log('Connect to Mongodb successfully!');
    })
    .catch(() => {
        console.log('Connect to Mongodb failed!');
    });

const Storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
        cb(
            null,
            new Date().toISOString().replace(/:/g, '-') + file.originalname
        );
    },
});

const filterImage = (req, file, cb) => {
    if (
        file.mimetype === 'image/png' ||
        file.mimetype === 'image/jpg' ||
        file.mimetype === 'image/jpeg'
    ) {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

const upload = multer({ storage: Storage, fileFilter: filterImage });
const bcryptSalt = bcrypt.genSaltSync(10);

app.use(
    cors({
        credentials: true,
        origin: '*',
    })
);
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);

app.use(express.json());
app.use(express.static('uploads'));

app.get('/', (req, res) => {
    return res.json({ message: 'HELLO MY LOVE!' });
});

app.get('/users', async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json({ statusCode: 200, data: users });
    } catch (error) {
        console.error('Error fetching users', error);
        res.status(500).json({ statusCode: 500, message: 'Server error.' });
    }
});

// Route để lấy danh sách transactions
app.get('/transactions', async (req, res) => {
    try {
        const transactions = await OrderModel.find();
        res.status(200).json({ statusCode: 200, data: transactions });
    } catch (error) {
        console.error('Error fetching transactions', error);
        res.status(500).json({ statusCode: 500, message: 'Server error.' });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log('>>> check body: ', req.body);
    const checkUser = await User.findOne({ username });
    if (checkUser) {
        const passOk = bcrypt.compareSync(password, checkUser.password);
        if (passOk) {
            jwt.sign(
                { username: checkUser.username, id: checkUser._id },
                process.env.JWTKEY,
                (err, token) => {
                    if (err) throw err;
                    res.cookie('token', token, {
                        httpOnly: true,
                        secure: false,
                        path: '/',
                        sameSite: 'strict',
                    });
                    return res.status(200).json({
                        statusCode: 200,
                        message: 'Login successfully.',
                        username: checkUser.username,
                        userId: checkUser._id,
                        role: checkUser.role,
                        token: token,
                    });
                }
            );
        } else {
            return res.status(422).json({
                message: 'password not ok',
                statusCode: 500,
            });
        }
    } else {
        return res.json('not found');
    }
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const userDoc = await User.create({
            username,
            password: bcrypt.hashSync(password, bcryptSalt),
            role: 'USER',
        });
        res.json({
            message: 'Register successfully!',
            data: userDoc,
            statusCode: 200,
        });
    } catch (e) {
        res.status(422).json(e);
    }
});

app.post(
    '/add-slide',
    AuthLogin.authLoginWithUploadFile(['ADMIN']),
    async (req, res, next) => {
        if (!req.body.file) {
            return res.status(422).json('File is empty');
        }
        try {
            const saveFile = await ImageModel.create({
                name: 'slide',
                image: req.body.file,
            });
            res.json({
                message: 'Save image successfully!',
                data: saveFile,
                statusCode: 200,
            });
        } catch {
            catchDeleteFile(req);
            res.status(422).json({
                message: 'Save image failed!',
                statusCode: 500,
            });
        }
    }
);

app.get('/get-slide', async (req, res, next) => {
    try {
        const getFiles = await ImageModel.find({ name: 'slide' });
        res.json({
            message: 'Get image successfully!',
            data: getFiles,
            statusCode: 200,
        });
    } catch {
        res.status(422).json({ message: 'Get image failed!', statusCode: 500 });
    }
});

app.delete(
    '/delete-slide',
    AuthLogin.authLogin(['ADMIN']),
    async (req, res, next) => {
        try {
            const { id } = req.body;
            if (!id)
                return res
                    .status(422)
                    .json({ message: 'Have no ID!', statusCode: 500 });
            await ImageModel.deleteOne({ _id: id });
            res.json({
                message: 'Delete image successfully!',
                statusCode: 200,
            });
        } catch {
            res.status(422).json({
                message: 'Delete image failed!',
                statusCode: 500,
            });
        }
    }
);

// CATEGORIES
app.post(
    '/add-category',
    AuthLogin.authLoginWithUploadFile(['ADMIN']),
    async (req, res, next) => {
        try {
            if (!req.body.file) {
                return res.status(422).json('File is empty');
            }
            const saveFile = await CategoriesModel.create({
                name: req.body.name,
                image: req.body.file,
            });
            res.json({
                message: 'Save image successfully!',
                data: saveFile,
                statusCode: 200,
            });
        } catch {
            catchDeleteFile(req);
            res.status(422).json({
                message: 'Save image failed!',
                statusCode: 500,
            });
        }
    }
);

app.get('/get-categories', async (req, res, next) => {
    try {
        const getCategories = await CategoriesModel.find();
        res.json({
            message: 'Get image successfully!',
            data: getCategories,
            statusCode: 200,
        });
    } catch {
        res.status(422).json({
            message: 'Save image failed!',
            statusCode: 500,
        });
    }
});

app.delete(
    '/delete-category',
    AuthLogin.authLogin(['ADMIN']),
    async (req, res, next) => {
        try {
            const { id } = req.body;
            const getCategory = await CategoriesModel.find({ _id: id });
            deleteFile(getCategory[0].image);
            await CategoriesModel.deleteOne({ _id: id });
            res.json({
                message: 'Delete image successfully!',
                statusCode: 200,
            });
        } catch {
            res.status(422).json({
                message: 'Delete image failed!',
                statusCode: 500,
            });
        }
    }
);

// PRODUCTS
app.post('/add-product', async (req, res, next) => {
    if (req.body.files.length === 0) {
        return res.status(422).json({
            message: 'File is empty,save product failed!',
            statusCode: 422,
        });
    }
    try {
        const saveFile = await ProductsModel.create({
            name: req.body.name,
            price: req.body.price,
            category_id: req.body.category_id,
            category_product: req.body.category_name,
            description_sale: req.body.description_sale,
            description_detail: req.body.description_detail,
            image: req.body.files,
        });
        res.json({
            message: 'Save product successfully!',
            data: saveFile,
            statusCode: 200,
        });
    } catch {
        catchDeleteFile(req);
        res.status(422).json({
            message: 'Save product failed!',
            statusCode: 500,
        });
    }
});

app.post('/edit-product', upload.array('photos', 4), async (req, res, next) => {
    console.log('>>> check body', req.body);
    if (req.body.files?.length > 0) {
        const newFiles = req.body.files;
        try {
            const getProductDetail = await ProductsModel.findOne({
                _id: req.body.id,
            });
            console.log('>>> check newFiles', newFiles);
            console.log('>>> check getProductDetail', getProductDetail);
            // getProductDetail.image.forEach(item => {
            //     helpDelete.deleteFile(item.file_path);
            // });
            console.log('>>> check getProductDetail after', getProductDetail);
            const saveFile = await ProductsModel.updateOne(
                { _id: req.body.id },
                {
                    name: req.body.name,
                    price: req.body.price,
                    category_id: req.body.category_id,
                    category_product: req.body.category_name,
                    description_sale: req.body.description_sale,
                    description_detail: req.body.description_detail,
                    image: newFiles,
                }
            );
            console.log('>>> check saveFile', saveFile);
            res.json({
                message: 'Edit product successfully!',
                data: saveFile,
                statusCode: 200,
            });
        } catch {
            catchDeleteFile(req);
            res.status(422).json({
                message: 'Edit product failed!',
                statusCode: 500,
            });
        }
    } else {
        try {
            const saveFile = await ProductsModel.updateOne(
                { _id: req.body.id },
                {
                    name: req.body.name,
                    price: req.body.price,
                    category_id: req.body.category_id,
                    category_product: req.body.category_name,
                    description_sale: req.body.description_sale,
                    description_detail: req.body.description_detail,
                }
            );
            res.json({
                message: 'Edit product successfully!',
                data: saveFile,
                statusCode: 200,
            });
        } catch {
            catchDeleteFile(req);
            res.status(422).json({
                message: 'Edit product failed!',
                statusCode: 500,
            });
        }
    }
});

app.get('/get-products', async (req, res, next) => {
    try {
        const getProducts = await ProductsModel.find();
        res.json({
            message: 'Get products successfully!',
            data: getProducts,
            statusCode: 200,
        });
    } catch {
        res.status(422).json({
            message: 'Save products failed!',
            statusCode: 500,
        });
    }
});

app.post('/get-product-detail', async (req, res, next) => {
    try {
        const { id } = req.body;
        const getProductDetail = await ProductsModel.findOne({ _id: id });
        res.json({
            message: 'Get product successfully!',
            data: getProductDetail,
            statusCode: 200,
        });
    } catch {
        res.status(422).json({
            message: 'Save product failed!',
            statusCode: 500,
        });
    }
});

app.post(
    '/related-product',
    AuthLogin.authLoginNoRole(),
    async (req, res, next) => {
        try {
            const { id } = req.body;
            const result = await ProductsModel.find({ category_id: id });
            res.json({
                message: 'Get image successfully!',
                data: result,
                statusCode: 200,
            });
        } catch {
            res.status(422).json({
                message: 'Save image failed!',
                statusCode: 500,
            });
        }
    }
);

app.delete('/delete-product', async (req, res, next) => {
    try {
        const { id } = req.body;
        const getProduct = await ProductsModel.find({ _id: id });
        getProduct[0].image.forEach(item => {
            deleteFile(item);
        });
        await ProductsModel.deleteOne({ _id: id });
        res.json({
            message: 'Delete image successfully!',
            statusCode: 200,
        });
    } catch {
        res.status(422).json({
            message: 'Delete image failed!',
            statusCode: 500,
        });
    }
});

// CART

app.post('/add-cart', async (req, res, next) => {
    try {
        const saveFile = await CartModel.create({
            name_product: req.body.name_product,
            product_id: req.body.product_id,
            category_product_name: req.body.category_product_name,
            category_id: req.body.category_id,
            price_product: req.body.price_product,
            quantity: req.body.quantity,
            image: req.body.file_image,
            user_id: req.body.user_id,
        });
        res.json({
            message: 'Save cart successfully!',
            data: saveFile,
            statusCode: 200,
        });
    } catch {
        res.status(422).json({ message: 'Save cart failed!', statusCode: 500 });
    }
});

app.post('/get-list-cart', async (req, res, next) => {
    try {
        const { id } = req.body;
        const listCart = await CartModel.find({ user_id: id });

        res.json({
            message: 'Get list cart successfully!',
            data: listCart,
            statusCode: 200,
        });
    } catch {
        res.status(422).json({
            message: 'Get list cart failed!',
            statusCode: 500,
        });
    }
});

app.delete('/delete-cart-item', async (req, res, next) => {
    try {
        const { id } = req.body;
        await CartModel.deleteOne({ _id: id });
        res.json({ message: 'Delete order successfully!', statusCode: 200 });
    } catch {
        res.status(422).json({
            message: 'Delete order failed!',
            statusCode: 500,
        });
    }
});

// ORDER
app.post('/add-order', AuthLogin.authLoginNoRole(), async (req, res, next) => {
    try {
        let data = {
            list_cart: req.body.list_cart,
            total: req.body.total,
            name_order: req.body.name_order,
            phone: req.body.phone,
            address: req.body.address,
            email: req.body.email,
        };

        const saveFile = await OrderModel.create({
            list_cart: req.body.list_cart,
            user_id: req.body.user_id,
            total: req.body.total,
            name_order: req.body.name_order,
            phone: req.body.phone,
            address: req.body.address,
            email: req.body.email,
            delivery: 0,
            status: 0,
        });

        // console.log('>>> check api: ', EmailModel.api);
        // await sendEmail(data); // Sử dụng hàm sendEmail ở đây

        console.log('>>> check req.body: ', req.body);
        await CartModel.deleteMany({ user_id: req.body.user_id });
        res.json({
            message: 'Create order successfully!',
            data: saveFile,
            statusCode: 200,
        });
    } catch (error) {
        console.error('Create order failed:', error);
        res.status(500).json({
            message: 'Create order failed!',
            statusCode: 500,
        });
    }
});

app.post(
    '/get-list-order',
    AuthLogin.authLoginNoRole(),
    async (req, res, next) => {
        try {
            const { id } = req.body;
            const listCart = await OrderModel.find({ user_id: id });
            res.json({
                message: 'Get list cart successfully!',
                data: listCart,
                statusCode: 200,
            });
        } catch {
            res.status(422).json({
                message: 'Get list cart failed!',
                statusCode: 500,
            });
        }
    }
);

app.post(
    '/get-list-cart-order',
    AuthLogin.authLoginNoRole(),
    async (req, res, next) => {
        try {
            const { id } = req.body;
            const listCart = await OrderModel.findOne({ _id: id });
            console.log('>>> Check listCart: ', listCart);
            res.json({
                message: 'Get list cart successfully!',
                data: listCart,
                statusCode: 200,
            });
        } catch {
            res.status(422).json({
                message: 'Get list cart failed!',
                statusCode: 500,
            });
        }
    }
);

// Order admin
app.post('/update-order-status', async (req, res) => {
    const { orderId, statusId } = req.body;
    try {
        const order = await OrderModel.findById(orderId);
        if (order) {
            console.log('>>> statusId :', statusId);
            order.status = statusId;
            await order.save();
            await sendEmail(order);
            res.status(200).json({
                statusCode: 200,
                message: 'Order status updated successfully.',
            });
        } else {
            res.status(404).json({
                statusCode: 404,
                message: 'Order not found.',
            });
        }
    } catch (error) {
        console.error('Error updating order status', error);
        res.status(500).json({ statusCode: 500, message: 'Server error.' });
    }
});

app.post('/cancel-order', async (req, res) => {
    try {
        const orderId = req.body.orderId;
        const order = await OrderModel.findByIdAndDelete(orderId);
        if (order) {
            res.status(200).json({
                statusCode: 200,
                message: 'Order cancelled successfully.',
            });
        } else {
            res.status(404).json({
                statusCode: 404,
                message: 'Order not found.',
            });
        }
    } catch (error) {
        console.error('Error cancelling order', error);
        res.status(500).json({ statusCode: 500, message: 'Server error.' });
    }
});

app.post('/accept-order', async (req, res) => {
    const { orderId } = req.body;
    console.log('>>> check req.body: ', req.body);
    try {
        const order = await OrderModel.findById(orderId);
        console.log('>>> check order: ', order);

        if (order) {
            order.accepted = true;
            await order.save();
            await sendEmail(order);
            res.status(200).json({
                statusCode: 200,
                message: 'Order accepted successfully.',
            });
        } else {
            res.status(404).json({
                statusCode: 404,
                message: 'Order not found.',
            });
        }
    } catch (error) {
        console.error('Error accepting order', error);
        res.status(500).json({ statusCode: 500, message: 'Server error.' });
    }
});

// slide middle

app.post('/add-slide-middle', async (req, res, next) => {
    if (req.body.files.length === 0) {
        return res.status(422).json({
            message: 'File is empty,save product failed!',
            statusCode: 422,
        });
    }
    try {
        const saveFile = await SlideMiddleModel.updateOne(
            { _id: req.body.id },
            {
                name: req.body.name,
                description: req.body.description,
                image: req.body.files,
            }
        );
        res.json({
            message: 'Save slide middle successfully!',
            data: saveFile,
            statusCode: 200,
        });
    } catch {
        catchDeleteFile(req);
        res.status(422).json({
            message: 'Save Slide Middle failed!',
            statusCode: 500,
        });
    }
});

app.get('/get-slide-middle', async (req, res, next) => {
    try {
        const getSlideMiddle = await SlideMiddleModel.find({});
        res.json({
            message: 'Get Slide Middle successfully!',
            data: getSlideMiddle,
            statusCode: 200,
        });
    } catch {
        res.status(422).json({
            message: 'Save Slide Middle failed!',
            statusCode: 500,
        });
    }
});

app.listen(process.env.PORT);
