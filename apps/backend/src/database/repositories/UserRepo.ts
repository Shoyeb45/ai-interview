import { RoleCode } from '@prisma/client';
import { InternalError } from '../../core/ApiError';
import { AuthUser } from '../../types/user';
import userMetricRepo from './user-metric.repo';
import { prisma } from '..';

async function findByEmail(email: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            roles: {
                where: {
                    role: {
                        status: true,
                    },
                },
                include: {
                    role: {
                        select: {
                            id: true,
                            code: true,
                            status: true,
                        },
                    },
                },
            },
        },
    });

    if (!user) return null;

    return {
        id: user.id,
        name: user.name,
        email: user.email,
        password: user.password,
        roles: user.roles.map((ur) => ({
            id: ur.role.id,
            code: ur.role.code as RoleCode,
            status: ur.role.status,
        })),
        verified: user.verified,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}

async function create(
    userData: { name: string; email: string; password: string },
    accessTokenKey: string,
    refreshTokenKey: string,
    roleCode: RoleCode,
) {

    // Find or get the role
    const role = await prisma.role.findUnique({
        where: { code: roleCode },
    });

    if (!role) throw new InternalError('Role must be defined.');

    // Create user and role relation in a transaction
    const result = await prisma.$transaction(async (tx: typeof prisma) => {
        // Create user
        const user = await tx.user.create({
            data: {
                name: userData.name,
                email: userData.email,
                password: userData.password,
            },
        });

        // Create user-role relation
        await tx.userRoleRelation.create({
            data: {
                userId: user.id,
                roleId: role.id,
            },
        });

        // Create keystore
        const keystoreData = await tx.keystore.create({
            data: {
                clientId: user.id,
                primaryKey: accessTokenKey,
                secondaryKey: refreshTokenKey,
            },
        });

        const keystore = {
            id: keystoreData.id,
            clientId: keystoreData.clientId,
            primaryKey: keystoreData.primaryKey,
            secondaryKey: keystoreData.secondaryKey,
            status: keystoreData.status,
            createdAt: keystoreData.createdAt,
            updatedAt: keystoreData.updatedAt,
        };

        // Get user with roles
        const userWithRoles = await tx.user.findUnique({
            where: { id: user.id },
            include: {
                roles: {
                    include: {
                        role: true,
                    },
                },
            },
        });

        return {
            user: {
                id: userWithRoles!.id,
                name: userWithRoles!.name,
                email: userWithRoles!.email,
                password: userWithRoles!.password,
                roles: userWithRoles!.roles.map(
                    (ur: {
                        role: {
                            id: number;
                            code: string;
                            status: boolean;
                            createdAt: Date;
                            updatedAt: Date;
                        };
                    }) => ({
                        id: ur.role.id,
                        code: ur.role.code as RoleCode,
                        status: ur.role.status,
                        createdAt: ur.role.createdAt,
                        updatedAt: ur.role.updatedAt,
                    }),
                ),
                verified: userWithRoles!.verified,
                status: userWithRoles!.status,
                createdAt: userWithRoles!.createdAt,
                updatedAt: userWithRoles!.updatedAt,
            },
            keystore,
        };
    });

    return result;
}

async function findById(id: number): Promise<AuthUser | null> {

    const user = await prisma.user.findFirst({
        where: {
            id,
            status: true,
        },
        include: {
            roles: {
                where: {
                    role: {
                        status: true,
                    },
                },
                include: {
                    role: true,
                },
            },
        },
    });

    if (!user) return null;

    return {
        id: user.id,
        name: user.name,
        email: user.email,
        password: user.password,
        roles: user.roles.map(
            (ur: {
                role: {
                    id: number;
                    code: string;
                    status: boolean;
                    createdAt: Date;
                    updatedAt: Date;
                };
            }) => ({
                id: ur.role.id,
                code: ur.role.code as RoleCode,
                status: ur.role.status,
                createdAt: ur.role.createdAt,
                updatedAt: ur.role.updatedAt,
            }),
        ),
        verified: user.verified,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}

async function checkById(id: number) {
    return prisma.user.findUnique({
        where: { id },
    });
}

async function checkByEmail(email: string) {
    return prisma.user.findUnique({
        where: { email },
    });
}

async function getUserDashboard(userId: number) {
    // Fetch user metrics
    const userMetrics = await userMetricRepo.getUserMetrics(userId);

    // Combine and format data
    return {
        totalInterviews: userMetrics?.totalInterviews || 0,
        completed: userMetrics?.completedInterviews || 0,
        averageScore: Math.round(userMetrics?.averageScore || 0), // Round to whole number for display
        practiceTime: userMetrics?.totalPracticeTime || 0, // in minutes
        strongestSkills: userMetrics?.strongestSkills || [],
        needsWork: userMetrics?.needsWorkSkills || [],
        improvingSkills: userMetrics?.improvingSkills || [],
        lastInterviewDate: userMetrics?.lastInterviewDate || null,

        // Additional useful stats
        recentActivity: {
            scoreHistory: userMetrics?.scoreHistory || [],
            skillProgress: userMetrics?.skillProgress || {},
        },
    };
}


export default {
    findByEmail,
    create,
    findById,
    checkById,
    checkByEmail,
    getUserDashboard
};