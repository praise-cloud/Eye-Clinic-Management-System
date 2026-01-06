import React, { useState, useEffect} from 'react';

// Tailwind CSS is assumed to be available globally in this environment.

// Define Nav Links and Icon mapping
const navItems = [
    { name: 'Dashboard', icon: 'th-large', view: 'dashboard' },
    { name: 'Messages', icon: 'envelope', view: 'messages' },
    { name: 'Test', icon: 'clipboard-check', view: 'test' },
    { name: 'Inventory', icon: 'box-open', view: 'inventory' },
    { name: 'Settings', icon: 'cog', view: 'settings' },
];

// Helper component for Icons (assumes Font Awesome is loaded via CDN in the environment)
const Icon = ({ name, className = '' }) => (
    <i className={`fas fa-${name} ${className}`}></i>
);

const App = () => {
    // State for form inputs
    const [concernId, setConcernId] = useState('');
    const [concernName, setConcernName] = useState('');
    const [note, setNote] = useState('');
    const [fileName, setFileName] = useState('No file chosen');
    const [activeView, setActiveView] = useState('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // For mobile toggle

    // Derived style properties based on original CSS variables (using custom Tailwind config colors)
    const primaryColor = 'text-[#3742fa]';
    const sidebarBg = 'bg-[#764ba2]';
    const sidebarActiveBg = 'bg-[#3742fa]';
    const accentColor = 'text-[#ffd700]';
    const headerBg = 'bg-gradient-to-r from-[#667eea] to-[#764ba2]';
    const dangerColor = 'bg-[#dc3545]';

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setFileName(file.name);
        } else {
            setFileName('No file chosen');
        }
    };

    const handleSave = () => {
        if (!concernId || !concernName) {
            console.error("ID and Name are required.");
            // Add custom modal/toast message here in a production environment
            return;
        }

        console.log('--- Attempting to save new concern (React State) ---');
        console.log('ID:', concernId);
        console.log('Name:', concernName);
        console.log('Note:', note);
        console.log('File:', fileName);
        console.log('----------------------------------------------------');

        // Reset form
        setConcernId('');
        setConcernName('');
        setNote('');
        setFileName('No file chosen');
        document.getElementById('fileUpload').value = '';
    };
    
    // Simple mobile detection/toggle logic
    useEffect(() => {
        const checkScreenSize = () => {
            if (window.innerWidth >= 768) {
                // Ensure sidebar is conceptually 'open' on desktop
                setIsSidebarOpen(true);
            } else {
                // By default, hide on smaller screens until a toggle is added (CSS hides it anyway)
                setIsSidebarOpen(false);
            }
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);


    // Helper for rendering the form
    const renderAddCaseForm = () => (
        <div className="p-4 sm:p-6 lg:p-8 bg-white rounded-xl shadow-lg max-w-4xl mx-auto">
            <h2 className={`text-2xl font-bold mb-8 text-center ${primaryColor}`}>Add Case</h2>

            <div className="flex flex-col gap-6">
                {/* Form Grid for ID and Name */}
                <div className="flex flex-col md:flex-row gap-6">
                    {/* ID Input */}
                    <div className="flex flex-col flex-1">
                        <label htmlFor="concernId" className="text-sm font-medium text-gray-700 mb-2">
                            ID <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                id="concernId"
                                type="text"
                                placeholder="Enter ID"
                                value={concernId}
                                onChange={(e) => setConcernId(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-4 pr-10 text-gray-800 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                            />
                            <Icon name="search" className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs cursor-pointer" />
                        </div>
                    </div>

                    {/* Name Input */}
                    <div className="flex flex-col flex-1">
                        <label htmlFor="concernName" className="text-sm font-medium text-gray-700 mb-2">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                id="concernName"
                                type="text"
                                placeholder="Enter Name"
                                value={concernName}
                                onChange={(e) => setConcernName(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-4 pr-10 text-gray-800 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                            />
                            <Icon name="search" className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs cursor-pointer" />
                        </div>
                    </div>
                </div>

                {/* Note Textarea */}
                <div className="flex flex-col">
                    <label htmlFor="note" className="text-sm font-medium text-gray-700 mb-2">
                        Note
                    </label>
                    <textarea
                        id="note"
                        rows="5"
                        placeholder="Add a detailed note about the concern..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-800 resize-y focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                    ></textarea>
                </div>

                {/* Upload Icon */}
                <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-2">Upload Icon</label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <input
                            type="file"
                            id="fileUpload"
                            onChange={handleFileChange}
                            accept=".png,.jpg,.jpeg,.webp,.svg"
                            className="hidden" // Hides the default file input
                        />
                        <label htmlFor="fileUpload" className={`cursor-pointer ${sidebarActiveBg} text-white font-medium py-2.5 px-6 rounded-lg whitespace-nowrap hover:bg-indigo-700 transition duration-200`}>
                            Choose file
                        </label>
                        <div className="flex-1 w-full sm:w-auto bg-gray-50 border border-gray-300 rounded-lg py-2.5 px-4 text-sm text-gray-500 min-w-[150px]">
                            {fileName}
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG, WebP, SVG - Max 2MB</p>
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    className={`self-start mt-4 ${sidebarActiveBg} text-white font-medium py-3 px-8 rounded-lg border-none cursor-pointer transition duration-200 hover:bg-indigo-700 hover:scale-[1.01] shadow-md`}
                >
                    Save
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col bg-gray-100 font-sans">
            {/* 1. HEADER */}
            <header className={`py-4 px-4 sm:px-8 shadow-lg z-10 ${headerBg}`}>
                <div className="flex justify-between items-center max-w-7xl mx-auto">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <Icon name="eye" className={`text-2xl ${accentColor}`} />
                        <div className="hidden lg:flex flex-col items-start leading-tight">
                            <h1 className="text-xl font-semibold text-white">KORENYE CLINIC</h1>
                            <span className="text-xs text-gray-300 font-light mt-1">Health Management System</span>
                        </div>
                    </div>
                    
                    {/* Admin Profile & Mobile Toggle */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-white font-medium">
                            <Icon name="user-circle" className="text-2xl" />
                            <span className="hidden sm:inline">Admin</span>
                            <Icon name="chevron-down" className="text-xs hidden sm:inline" />
                        </div>
                        {/* Mobile Menu Button (Hamburger) */}
                        <button 
                            className="text-white lg:hidden p-2"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        >
                            <Icon name={isSidebarOpen ? "times" : "bars"} className="text-xl" />
                        </button>
                    </div>
                </div>
            </header>

            {/* 2. MAIN LAYOUT: SIDEBAR + CONTENT */}
            <div className="flex flex-1 overflow-hidden">
                
                {/* 2a. SIDEBAR */}
                <nav className={`absolute lg:relative h-full lg:h-auto z-20 ${sidebarBg} text-white transition-all duration-300 ease-in-out 
                                shadow-xl lg:shadow-none overflow-y-auto 
                                ${isSidebarOpen ? 'w-64 md:w-20' : 'w-0 md:w-0'}
                                lg:w-64 lg:translate-x-0 
                                ${!isSidebarOpen && window.innerWidth < 1024 ? 'transform -translate-x-full' : ''}
                                `}
                >
                    <ul className="list-none p-0">
                        {navItems.map((item) => (
                            <li key={item.name} className="m-0">
                                <a
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); setActiveView(item.view); }}
                                    className={`flex items-center gap-4 py-4 px-6 text-gray-300 text-base no-underline transition-all duration-300 ease-in-out border-l-4 border-transparent hover:${sidebarActiveBg} hover:text-white hover:border-[#ffd700] 
                                                ${activeView === item.view ? `${sidebarActiveBg} text-white border-[#ffd700]` : ''}
                                                md:justify-center lg:justify-start lg:py-4 lg:px-6 md:px-0 md:w-20 lg:w-full`}
                                >
                                    <Icon name={item.icon} className="text-lg w-5" />
                                    <span className="hidden lg:inline text-base">{item.name}</span>
                                </a>
                            </li>
                        ))}
                        
                        {/* Logout Link */}
                        <li className="m-0 mt-4">
                            <a 
                                href="#"
                                onClick={(e) => e.preventDefault()}
                                className={`flex items-center gap-4 py-4 px-6 text-gray-300 text-base no-underline transition-all duration-300 ease-in-out border-l-4 border-transparent hover:${dangerColor} hover:text-white 
                                            md:justify-center lg:justify-start lg:py-4 lg:px-6 md:px-0 md:w-20 lg:w-full`}
                            >
                                <Icon name="sign-out-alt" className="text-lg w-5" />
                                <span className="hidden lg:inline text-base">Logout</span>
                            </a>
                        </li>
                    </ul>
                </nav>

                {/* 2b. CONTENT AREA - Dynamic Content */}
                <main className="flex-1 p-4 sm:p-8 overflow-y-auto bg-gray-50">
                    {/* Render the form regardless of the active view for this single-page design */}
                    {renderAddCaseForm()}
                </main>
            </div>
        </div>
    );
};

export default App;
