import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
    return new Date(date).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatDuration(start: string, end?: string): string {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const duration = Math.max(0, endTime - startTime);

    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

export function getStatusColor(status: string): string {
    switch (status) {
        case 'SUCCESS':
            return 'text-green-600 bg-green-50';
        case 'FAILED':
            return 'text-red-600 bg-red-50';
        case 'RUNNING':
            return 'text-blue-600 bg-blue-50';
        case 'PENDING':
        case 'QUEUED':
            return 'text-yellow-600 bg-yellow-50';
        case 'CANCELLED':
            return 'text-gray-600 bg-gray-50';
        default:
            return 'text-gray-600 bg-gray-50';
    }
}

export function getStatusIcon(status: string): string {
    switch (status) {
        case 'SUCCESS':
            return '✓';
        case 'FAILED':
            return '✗';
        case 'RUNNING':
            return '⟳';
        case 'PENDING':
        case 'QUEUED':
            return '○';
        case 'CANCELLED':
            return '⊘';
        default:
            return '?';
    }
}
