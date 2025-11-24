
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../App';
import { Modal, Input, Button, Icon } from './ui';

const ProfileModal: React.FC = () => {
    const { userProfile, updateUserProfile, deleteUserAccount, isProfileModalOpen, setIsProfileModalOpen, addNotification } = useAppContext();
    const [formData, setFormData] = useState({
        name: '',
        photoURL: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (userProfile && isProfileModalOpen) {
            setFormData({
                name: userProfile.name || '',
                photoURL: userProfile.photoURL || ''
            });
        }
    }, [userProfile, isProfileModalOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateUserProfile(formData);
            addNotification("Profile updated successfully", "success");
            setIsProfileModalOpen(false);
        } catch (error: any) {
            addNotification("Failed to update profile: " + error.message, "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete your account? This action is permanent and cannot be undone.")) {
            setIsDeleting(true);
            try {
                await deleteUserAccount();
                // Auth listener in App.tsx will handle redirection/logout state
            } catch (error: any) {
                console.error("Delete error:", error);
                addNotification("Failed to delete account. You may need to re-login first.", "error");
                setIsDeleting(false);
            }
        }
    };

    if (!userProfile) return null;

    return (
        <Modal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} title="User Profile">
            <div className="space-y-6">
                <div className="flex flex-col items-center gap-4 mb-6">
                    <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center border-2 border-violet-500 overflow-hidden shadow-lg">
                        {formData.photoURL ? (
                            // Since we're just storing a filename string usually, we can't really display it as an image unless it's a full URL. 
                            // If it's a URL (http...), use img. If just a name, show initials.
                            formData.photoURL.startsWith('http') ? (
                                <img src={formData.photoURL} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-3xl font-bold text-slate-300">{formData.name.charAt(0).toUpperCase()}</span>
                            )
                        ) : (
                            <span className="text-3xl font-bold text-slate-300">{formData.name.charAt(0).toUpperCase()}</span>
                        )}
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-slate-400">Member since</p>
                        <p className="font-medium text-slate-200">{new Date(userProfile.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">Email (Read-only)</label>
                        <div className="w-full p-3 bg-slate-900/50 border border-slate-700 text-slate-400 rounded-lg">
                            {userProfile.email}
                        </div>
                    </div>
                    <Input 
                        label="Full Name" 
                        name="name" 
                        value={formData.name} 
                        onChange={handleChange} 
                    />
                    <Input 
                        label="Photo URL / Filename" 
                        name="photoURL" 
                        value={formData.photoURL} 
                        onChange={handleChange} 
                        placeholder="Enter image URL or filename"
                    />
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-700/50">
                    <Button 
                        variant="danger" 
                        onClick={handleDelete} 
                        disabled={isDeleting || isSaving}
                        icon="delete_forever"
                        className="!bg-red-900/50 hover:!bg-red-800/50 !text-red-200"
                    >
                        {isDeleting ? 'Deleting...' : 'Delete Account'}
                    </Button>
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={() => setIsProfileModalOpen(false)} disabled={isSaving}>Cancel</Button>
                        <Button variant="primary" onClick={handleSave} disabled={isSaving || isDeleting}>
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ProfileModal;