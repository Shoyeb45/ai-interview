import { Router } from 'express';
import signupRoute from './signup';
import signinRoute from './signin';
import signoutRoute from './signout';
import refreshTokenRouter from './token';
import identityRoutes from "./identity";

const router = Router();

router.use('/signup', signupRoute);
router.use('/signin', signinRoute);
router.use('/signout', signoutRoute);
router.use('/token', refreshTokenRouter);
router.use('/me', identityRoutes);

export default router;
