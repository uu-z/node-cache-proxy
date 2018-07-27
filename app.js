const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const axios = require('axios');

var app = new Koa();
var router = new Router();

const { PORT = 8080 } = process.env;

app.use(bodyParser());

app.use(async (ctx, next) => {
	const start = new Date();
	await next();
	const ms = new Date() - start;
	console.log(`-> ${ctx.method} ${ctx.url} - ${ms}ms`);
});
app.use(async (ctx, next) => {
	try {
		await next();
	} catch (err) {
		console.log(err);
		ctx.status = err.statusCode || err.status || 500;
		ctx.body = {
			message: err.message
		};
	}
});

router.post('/proxy', async (ctx, next) => {
	let { data } = await axios(ctx.request.body);
	ctx.body = data;
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(PORT);
console.info(`Server listening on port ${PORT}...`);