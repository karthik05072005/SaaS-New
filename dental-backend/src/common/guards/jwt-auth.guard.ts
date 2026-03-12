import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
        // Let the parent do standard JWT validation (throws 401 if invalid)
        const validated = super.handleRequest(err, user, info, context);

        // After Passport sets req.user, copy tenantId onto req directly
        // This fixes the ordering issue where TenantMiddleware runs before JWT guard
        if (validated?.tenantId) {
            const request = context.switchToHttp().getRequest();
            request.tenantId = validated.tenantId.toString();
        }

        return validated;
    }
}

