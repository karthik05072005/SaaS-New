import { useNavigate } from 'react-router-dom';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { Save, ArrowLeft } from 'lucide-react';

export function NewPatient() {
    const navigate = useNavigate();

    const headerContent = (
        <Button variant="ghost" className="mb-2 -ml-4" onClick={() => navigate('/patients')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Directory
        </Button>
    );

    return (
        <PageWrapper
            title="New Patient Registration"
            description="Enter the primary details for the new patient."
            headerContent={headerContent}
            action={
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => navigate('/patients')}>
                    <Save className="mr-2 h-4 w-4" /> Save Patient
                </Button>
            }
        >
            <Card>
                <CardContent className="p-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <label htmlFor="firstName" className="text-sm font-medium">First Name *</label>
                            <Input id="firstName" placeholder="John" />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="lastName" className="text-sm font-medium">Last Name *</label>
                            <Input id="lastName" placeholder="Doe" />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="phone" className="text-sm font-medium">Phone Number *</label>
                            <Input id="phone" placeholder="+91 98765 43210" />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium">Email Address</label>
                            <Input id="email" type="email" placeholder="john.doe@example.com" />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="dob" className="text-sm font-medium">Date of Birth</label>
                            <Input id="dob" type="date" />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="gender" className="text-sm font-medium">Gender</label>
                            <Input id="gender" placeholder="Male / Female / Other" />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label htmlFor="address" className="text-sm font-medium">Residential Address</label>
                            <Input id="address" placeholder="123 Main St, Appt 4B, Mumbai, MH" />
                        </div>

                        <div className="space-y-2 md:col-span-2 mt-4 pt-4 border-t">
                            <h3 className="font-semibold text-lg text-slate-800">Medical History Summary</h3>
                            <p className="text-sm text-slate-500 mb-2">Briefly list any known conditions or allergies.</p>
                            <Input id="medical" placeholder="e.g., Penicillin allergy, Hypertension" className="h-20" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </PageWrapper>
    );
}
