import { useUserReports, type UserReport, type ProspectDossier } from '@/hooks/useUserReports';
import { FileText, Clock, CheckCircle2, AlertCircle, ChevronRight, Loader2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

function formatDate(dateString: string | null): string {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function getStatusIcon(status: string | null) {
    switch (status) {
        case 'completed':
            return <CheckCircle2 className="w-4 h-4 text-green-500" />;
        case 'running':
        case 'in_progress':
            return <Clock className="w-4 h-4 text-amber-500" />;
        case 'failed':
        case 'error':
            return <AlertCircle className="w-4 h-4 text-red-500" />;
        default:
            return <Clock className="w-4 h-4 text-gray-400" />;
    }
}

function getStatusLabel(status: string | null): string {
    switch (status) {
        case 'completed':
            return 'Completed';
        case 'running':
        case 'in_progress':
            return 'In Progress';
        case 'failed':
        case 'error':
            return 'Failed';
        default:
            return 'Pending';
    }
}

interface ReportCardProps {
    report: UserReport;
}

function ReportCard({ report }: ReportCardProps) {
    const [expanded, setExpanded] = useState(false);
    const { session, dossiers } = report;
    const criteria = session.criteria;

    // Build a summary from criteria
    const summaryParts: string[] = [];
    if (criteria.targetCategories && criteria.targetCategories.length > 0) {
        summaryParts.push(criteria.targetCategories.slice(0, 2).join(', '));
    }
    if (criteria.states && criteria.states.length > 0) {
        summaryParts.push(`in ${criteria.states.slice(0, 2).join(', ')}`);
    }
    if (criteria.competitors && criteria.competitors.length > 0) {
        summaryParts.push(`vs ${criteria.competitors[0]}`);
    }
    const summary = summaryParts.join(' ') || 'Research session';

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
            >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{summary}</h4>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                        <span>{formatDate(session.created_at)}</span>
                        <span className="flex items-center gap-1">
                            {getStatusIcon(session.status)}
                            {getStatusLabel(session.status)}
                        </span>
                        <span>{dossiers.length} account{dossiers.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>

                <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </button>

            {/* Expanded Content - Dossiers */}
            {expanded && dossiers.length > 0 && (
                <div className="border-t border-gray-100 px-5 py-3 space-y-2 bg-gray-50">
                    {dossiers.map((dossier) => (
                        <DossierRow key={dossier.id} dossier={dossier} />
                    ))}
                </div>
            )}

            {expanded && dossiers.length === 0 && (
                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                    <p className="text-sm text-gray-500 text-center">No account reports in this session</p>
                </div>
            )}
        </div>
    );
}

interface DossierRowProps {
    dossier: ProspectDossier;
}

function DossierRow({ dossier }: DossierRowProps) {
    return (
        <div className="flex items-center gap-3 px-3 py-2 bg-white rounded-lg border border-gray-100">
            <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{dossier.prospect_name}</p>
                {dossier.prospect_state && (
                    <p className="text-xs text-gray-500">{dossier.prospect_state}</p>
                )}
            </div>
            <div className="flex items-center gap-1">
                {getStatusIcon(dossier.status)}
                <span className="text-xs text-gray-500">{getStatusLabel(dossier.status)}</span>
            </div>
        </div>
    );
}

export function ReportsList() {
    const { reports, loading, error, refetch } = useUserReports();

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-sm text-red-600 mb-2">Failed to load reports</p>
                <Button variant="outline" size="sm" onClick={refetch}>
                    Try Again
                </Button>
            </div>
        );
    }

    if (reports.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No Reports Yet</h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                    When you run research on target accounts, your reports will appear here.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {reports.map((report) => (
                <ReportCard key={report.session.id} report={report} />
            ))}
        </div>
    );
}
