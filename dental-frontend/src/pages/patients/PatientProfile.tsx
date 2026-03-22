import { useParams, useNavigate } from 'react-router-dom';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Button } from '../../components/ui/button';
import { Calendar as CalendarIcon, Phone, Mail, Edit, Loader2, User, Clock, FileText, Camera } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { usePatient, usePatientHistory, usePatientNotes } from '../../hooks/usePatients';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { useState } from 'react';
import { EditPatientDialog } from './EditPatientDialog';

export function PatientProfile() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [editOpen, setEditOpen] = useState(false);

    const { data: patient, isLoading: isPatientLoading } = usePatient(id || '');
    const { data: historyData, isLoading: isHistoryLoading } = usePatientHistory(id || '');
    const { data: notes = [], isLoading: isNotesLoading } = usePatientNotes(id || '');

    const isLoading = isPatientLoading || isHistoryLoading || isNotesLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="p-8 text-center bg-white rounded-lg border">
                <h2 className="text-xl font-semibold text-slate-800">Patient not found</h2>
                <Button onClick={() => navigate('/patients')} className="mt-4">Back to Patients</Button>
            </div>
        );
    }

    const { notes: historyNotes = [] } = historyData || {};

    return (
        <PageWrapper
            title={patient.name}
            description={`Patient ID: #${patient.patientId} • Added ${patient.createdAt ? format(new Date(patient.createdAt), 'MMM yyyy') : 'N/A'}`}
            action={
                <div className="flex gap-2">
                    <Button variant="outline" className="rounded-xl border-slate-200" onClick={() => navigate(`/appointments?patient=${id}`)}>
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" /> Book Appointment
                    </Button>
                    <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 rounded-xl" onClick={() => setEditOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit Profile
                    </Button>
                </div>
            }
        >
            <EditPatientDialog 
                patient={patient} 
                open={editOpen} 
                onOpenChange={setEditOpen} 
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card className="md:col-span-1 border-t-4 border-t-primary shadow-sm overflow-hidden rounded-[2rem] border-none">
                    <CardContent className="p-6">
                        <div className="flex flex-col items-center mb-6 pt-2">
                            <Avatar className="h-40 w-40 border-4 border-white shadow-xl mb-4">
                                <AvatarImage src={patient.photoUrl} alt={patient.name} className="object-cover" />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                    <User className="h-20 w-20" />
                                </AvatarFallback>
                            </Avatar>
                            <div className="text-center">
                                <h3 className="font-bold text-xl text-slate-900 font-outfit">{patient.name}</h3>
                                <Badge variant="outline" className={`mt-2 border-none font-bold ${patient.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                                    {patient.isActive ? 'Active Member' : 'Inactive'}
                                </Badge>
                            </div>
                        </div>

                        <div className="space-y-4 text-sm mt-6 border-t border-slate-100 pt-6">
                            <h4 className="font-bold text-slate-400 uppercase text-[10px] tracking-widest mb-2">Connect</h4>
                            <div className="flex items-center gap-3 text-slate-600">
                                <div className="bg-primary/5 p-1.5 rounded-lg">
                                    <Phone className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <span className="font-bold">{patient.phone}</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600">
                                <div className="bg-primary/5 p-1.5 rounded-lg">
                                    <Mail className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <span className="font-bold truncate">{patient.email || 'No email provided'}</span>
                            </div>

                            <div className="pt-4 space-y-3">
                                <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-100">
                                    <span className="text-slate-400 font-medium">Age / Gender</span>
                                    <span className="font-bold text-slate-900">
                                        {patient.dateOfBirth ? `${new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()}y` : 'N/A'}, {patient.gender || 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-100">
                                    <span className="text-slate-400 font-medium">Blood Group</span>
                                    <span className="font-bold text-slate-900">{patient.bloodGroup || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-100">
                                    <span className="text-slate-400 font-medium">Last Visit</span>
                                    <span className="font-bold text-slate-900">
                                        {patient.lastVisit ? format(new Date(patient.lastVisit), 'MMM d, yyyy') : 'No recent visits'}
                                    </span>
                                </div>
                            </div>

                            {(patient.medicalHistory || (patient.allergies && patient.allergies.length > 0)) && (
                                <div className="mt-4 bg-orange-50 -mx-6 px-6 py-4 border-t border-b border-orange-100">
                                    <span className="font-bold text-orange-800 text-[10px] uppercase tracking-widest block mb-2">Medical Alerts</span>
                                    <div className="space-y-2">
                                        {patient.allergies && patient.allergies.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {patient.allergies.map((allergy: string) => (
                                                    <Badge key={allergy} variant="destructive" className="text-[10px] py-0 px-2 bg-red-100 text-red-700 hover:bg-red-100 border-none">
                                                        Allergy: {allergy}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                        {patient.medicalHistory && (
                                            <p className="text-xs font-semibold text-slate-800 leading-relaxed italic border-l-2 border-orange-300 pl-3 py-1">
                                                "{patient.medicalHistory}"
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="md:col-span-2">
                    <Tabs defaultValue="history" className="w-full">
                        <TabsList className="grid w-full grid-cols-4 bg-slate-100 p-1">
                            <TabsTrigger value="history">Visits</TabsTrigger>
                            <TabsTrigger value="notes">Clinical Notes</TabsTrigger>
                            <TabsTrigger value="documents">Files</TabsTrigger>
                            <TabsTrigger value="billing">Billing</TabsTrigger>
                        </TabsList>

                        <TabsContent value="history" className="mt-4 focus-visible:ring-0">
                            <Card className="border-none shadow-sm ring-1 ring-slate-200">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <h4 className="font-bold text-slate-900 flex items-center gap-2 font-outfit text-lg">
                                            <Clock className="h-5 w-5 text-primary" />
                                            Visit History
                                        </h4>
                                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold">
                                            {historyNotes.length} Records Found
                                        </Badge>
                                    </div>

                                    {historyNotes.length > 0 ? (
                                        <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary/20 before:to-transparent">
                                            {historyNotes.map((note: any) => (
                                                <div key={note._id} className="relative pl-12 group">
                                                    <span className="absolute left-3 top-1.5 h-4 w-4 rounded-full border-4 border-white bg-primary shadow-sm z-10 group-hover:scale-125 transition-transform"></span>
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-xs font-bold text-slate-400">
                                                                {format(new Date(note.createdAt), 'MMM d, yyyy • p')}
                                                            </span>
                                                            <span className="text-[10px] font-extrabold bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                                                Dr. {note.doctorId?.name || 'Unknown'}
                                                            </span>
                                                        </div>
                                                        <h5 className="font-bold text-slate-900 mt-1 flex items-center gap-2 text-base">
                                                            {note.diagnosis || note.treatmentDone || 'Follow-up / Consultation'}
                                                        </h5>
                                                        <p className="text-sm text-slate-600 leading-relaxed mt-1">
                                                            {note.clinicalFindings || 'No findings recorded for this visit.'}
                                                        </p>
                                                        {note.treatmentPlan && (
                                                            <div className="mt-2 text-[11px] font-medium text-primary bg-primary/5 px-3 py-1.5 rounded-md inline-flex items-center gap-2 w-fit">
                                                                <FileText className="h-3 w-3" />
                                                                <b>Plan:</b> {note.treatmentPlan}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-12 text-center text-slate-400">
                                            <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                            <p className="text-sm font-medium">No visit history found.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="notes" className="mt-4 focus-visible:ring-0">
                            <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-[2rem] overflow-hidden">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <h4 className="font-bold text-slate-900 flex items-center gap-2 font-outfit text-lg">
                                            <FileText className="h-5 w-5 text-primary" />
                                            Clinical Notes
                                        </h4>
                                        <Button size="sm" className="bg-primary hover:bg-primary/90 font-bold shadow-lg shadow-primary/20 rounded-xl px-4">+ New Note</Button>
                                    </div>
                                    <div className="space-y-4">
                                        {notes.length > 0 ? (
                                            notes.map((note: any) => (
                                                <div key={note._id} className="p-5 border rounded-xl bg-white hover:shadow-md transition-all cursor-pointer border-slate-200">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <h5 className="font-bold text-slate-900">{note.diagnosis || 'Clinical Record'}</h5>
                                                            <p className="text-xs text-slate-400 font-bold mt-1">
                                                                {format(new Date(note.createdAt), 'MMM d, yyyy')} • Dr. {note.doctorId?.name}
                                                            </p>
                                                        </div>
                                                        <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-none font-bold text-[10px] tracking-widest">
                                                            COMPLETED
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                                                        {note.clinicalFindings || note.treatmentDone}
                                                    </p>
                                                    {note.prescriptions && note.prescriptions.length > 0 && (
                                                        <div className="flex gap-2 mt-4">
                                                            <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1">
                                                                <FileText className="h-3 w-3" /> Prescription Added
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="py-12 text-center text-slate-400">
                                                <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                                <p className="text-sm font-medium">No clinical notes recorded yet.</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="documents" className="mt-4 focus-visible:ring-0">
                            <Card className="border-none shadow-sm ring-1 ring-slate-200">
                                <CardContent className="p-20 text-center text-muted-foreground border-dashed border-2 m-4 rounded-xl flex flex-col items-center gap-2">
                                    <Camera className="h-10 w-10 opacity-20" />
                                    <p className="font-medium">Document management UI coming soon</p>
                                    <p className="text-xs">Storage integration in progress</p>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="billing" className="mt-4 focus-visible:ring-0">
                            <Card className="border-none shadow-sm ring-1 ring-slate-200">
                                <CardContent className="p-20 text-center text-muted-foreground border-dashed border-2 m-4 rounded-xl flex flex-col items-center gap-2">
                                    <Mail className="h-10 w-10 opacity-20" />
                                    <p className="font-medium">Patient invoices & payments trackable soon</p>
                                    <p className="text-xs">Ledger integration pending</p>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </PageWrapper>
    );
}
