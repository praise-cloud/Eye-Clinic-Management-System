import React, { useState } from 'react';
<<<<<<< HEAD
import useUser from '../hooks/useUser';
import useUser from '../hooks/useUser';
=======

// Component to hold all the necessary custom CSS styles
const AppStyles = () => (
    <style>
        {`
        /* Import Font Awesome - kept for icons */
        @import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css");

        /* -----------------------------------------------------
         * 1. Global Styles, Root Variables, and Typography
         * ----------------------------------------------------- */
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

        :root {
            /* --- Template Colors --- */
            --primary-color: #3742fa; /* Blue for primary actions (Upload) */
            --secondary-color: #6c757d;
            --text-color: #2c3e50;
            --light-text-color: #7f8c8d;
            --border-color: #dee2e6;
            --bg-light: #f5f6fa;
            --bg-white: #ffffff;
            --sidebar-bg: #764ba2;
            --sidebar-text: #bdc3c7;
            --sidebar-active-bg: #3742fa;
            --accent-color: #ffd700;
            --header-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --card-bg: #ffffff;
            --shadow-light: rgba(0, 0, 0, 0.05);
            --danger-color: #dc3545;
            --warning-color: #ffc107;
            --info-color: #17a2b8; /* Used for success/status color */

            --sidebar-width: 250px;
        }

        /* Universal Reset */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Poppins', sans-serif;
            background-color: var(--bg-light);
            color: var(--text-color);
            overflow: hidden;
            height: 100vh;
        }

        a {
            text-decoration: none;
            color: inherit;
        }

        /* -----------------------------------------------------
         * 2. APP LAYOUT
         * ----------------------------------------------------- */
        .app-container {
            height: 100vh;
            display: flex;
            flex-direction: column; 
        }

        /* Wrapper for Sidebar and Content */
        .main-content-wrapper {
            display: flex;
            flex: 1; 
            overflow: hidden; 
        }

        /* -----------------------------------------------------
         * 3. HEADER STYLING
         * ----------------------------------------------------- */
        .app-header {
            background: var(--header-bg);
            color: white;
            padding: 1rem 2rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
        }

        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            max-width: 1200px;
            margin: 0 auto;
        }

        .logo {
            display: flex; 
            align-items: center; 
            gap: 10px; 
        }

        .logo i {
            font-size: 2rem;
            color: var(--accent-color);
        }

        .logo h1 {
            font-size: 1.5rem;
            font-weight: 600;
        }

        .user-info {
            display: flex;
            align-items: center;
            gap: 10px;
            color: white; 
            font-weight: 500;
        }

        .user-info .avatar {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            object-fit: cover;
            border: 1px solid rgba(255, 255, 255, 0.5);
        }

        /* -----------------------------------------------------
         * 4. SIDEBAR NAVIGATION STYLING
         * ----------------------------------------------------- */
        .sidebar {
            width: var(--sidebar-width);
            background-color: var(--sidebar-bg);
            color: white;
            height: 100%; 
            overflow-y: auto;
            box-shadow: 2px 0 10px rgba(0,0,0,0.1);
            flex-shrink: 0;
        }

        .nav-menu {
            list-style: none;
            padding: 1rem 0;
        }

        .nav-item {
            margin: 0;
        }

        .nav-link{
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem 1.5rem;
            color: var(--sidebar-text);
            text-decoration: none;
            transition: all 0.3s ease;
            border-left: 3px solid transparent;
        }

        .nav-link:hover {
            background-color: var(--sidebar-active-bg);
            color: white;
            border-left-color: var(--accent-color);
        }

        /* Specific logout hover style */
        .nav-link:has(i.fa-sign-out-alt):hover {
            color: white !important;
            background-color: var(--danger-color);
        }

        .nav-item.active .nav-link {
            background-color: var(--sidebar-active-bg);
            color: white;
            border-left-color: var(--accent-color);
        }

        .nav-link i {
            font-size: 1.1rem;
            width: 20px;
        }

        /* -----------------------------------------------------
         * 5. MAIN CONTENT AREA
         * ----------------------------------------------------- */
        .content-area {
            flex: 1; 
            padding: 2rem;
            overflow-y: auto;
            background-color: var(--bg-light);
        }

        .page-header {
            margin-bottom: 20px;
            font-size: 1.8em;
            font-weight: 700;
        }
        
        .section-header {
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 0.75rem;
            margin-bottom: 1.5rem;
        }

        .section-header h2 {
            font-size: 2rem;
            font-weight: 700;
            color: var(--text-color);
        }

        .section-header p {
            font-size: 0.9em;
            color: var(--light-text-color);
        }

        /* -----------------------------------------------------
         * 6. DASHBOARD COMPONENTS
         * ----------------------------------------------------- */

        /* Layout for the 4 stat cards */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(1, 1fr);
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .stat-card {
            background-color: var(--card-bg);
            padding: 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 4px 10px var(--shadow-light);
            display: flex;
            align-items: center;
            gap: 1rem;
            transition: all 0.2s ease;
        }

        .stat-card:hover {
            box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1);
            transform: translateY(-2px);
        }

        .stat-icon-wrapper {
            padding: 0.75rem;
            border-radius: 50%;
        }

        .stat-icon-wrapper i {
            font-size: 1.5rem;
        }

        .stat-content h3 {
            font-size: 0.9rem;
            font-weight: 500;
            color: var(--light-text-color);
            margin-bottom: 0.25rem;
        }

        .stat-content .stat-number {
            font-size: 1.75rem;
            font-weight: 700;
            color: var(--text-color);
        }

        /* Stat Color Utilities (Mapped to user's palette) */
        .stat-primary { color: var(--primary-color); }
        .stat-bg-primary { background-color: rgba(55, 66, 250, 0.1); } /* Blue */

        .stat-success { color: #28a745; } /* Green */
        .stat-bg-success { background-color: rgba(40, 167, 69, 0.1); }

        .stat-warning { color: var(--warning-color); } /* Yellow */
        .stat-bg-warning { background-color: rgba(255, 193, 7, 0.1); }

        .stat-danger { color: var(--danger-color); } /* Red */
        .stat-bg-danger { background-color: rgba(220, 53, 69, 0.1); }


        /* Dashboard Widgets Layout */
        .dashboard-widgets-grid {
            display: grid;
            grid-template-columns: repeat(1, 1fr);
            gap: 1.5rem;
        }

        .widget {
            background-color: var(--card-bg);
            padding: 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 4px 10px var(--shadow-light);
        }

        .widget-header {
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 0.75rem;
            margin-bottom: 1rem;
        }

        .widget-header h3 {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-color);
        }

        .quick-actions {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }

        /* Button base style */
        .action-btn {
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 1em;
            transition: background-color 0.15s, box-shadow 0.15s;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            color: var(--bg-white);
            border: none;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        /* Specific Button Styles */
        .btn-primary-action { /* Add Patient */
            background-color: var(--primary-color);
        }
        .btn-primary-action:hover {
            background-color: #2e3af7; 
        }

        .btn-secondary-action { /* Schedule Appointment (Mapped to a shade of gray/indigo) */
            background-color: #555c9d; 
        }
        .btn-secondary-action:hover {
            background-color: #434a7c;
        }

        .btn-tertiary-action { /* New Examination (Mapped to a darker gray) */
            background-color: #343a40; 
        }

        .btn-tertiary-action:hover {
            background-color: #1d2124;
        }

        /* Empty State Styling */
        .empty-state-content {
            min-height: 10rem;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            font-size: 1.1em;
            color: var(--light-text-color);
            font-style: italic;
        }

        /* -----------------------------------------------------
         * 7. RESPONSIVE DESIGN
         * ----------------------------------------------------- */

        @media (min-width: 640px) {
            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }

        @media (min-width: 1024px) { 
            .stats-grid {
                grid-template-columns: repeat(4, 1fr);
            }
            .dashboard-widgets-grid {
                grid-template-columns: repeat(3, 1fr);
            }
            .widget.recent-appointments { /* lg:col-span-2 */
                grid-column: span 2 / span 2;
            }
        }

        @media (max-width: 992px) {
            .app-header {
                padding: 1rem;
            }

            .sidebar {
                width: 80px;
                padding: 15px 0;
            }
            .nav-link {
                justify-content: center;
                padding: 10px 0;
                gap: 0;
            }
            .nav-link span { 
                display: none; 
            } 
            .nav-link i {
                margin: 0;
            }
            .nav-link:hover,
            .nav-item.active .nav-link {
                border-left: none;
                border-right: 3px solid var(--accent-color);
                background-color: var(--sidebar-active-bg);
            }
            
            .content-area {
                padding: 1rem;
            }
        }
        `}
    </style>
);
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9

// Helper to map old Tailwind colors to new semantic classes
const getStatClasses = (color) => {
    if (color.includes('blue')) return { icon: 'stat-primary', bg: 'stat-bg-primary' };
    if (color.includes('green')) return { icon: 'stat-success', bg: 'stat-bg-success' };
    if (color.includes('yellow')) return { icon: 'stat-warning', bg: 'stat-bg-warning' };
    if (color.includes('red')) return { icon: 'stat-danger', bg: 'stat-bg-danger' };
    return {};
};

// Main application component
<<<<<<< HEAD
const InventoryScreen = () => {
    const { user } = useUser();
    const [inventoryItems, setInventoryItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [itemFormData, setItemFormData] = useState({
        item_code: '', item_name: '', category: '', description: '',
        manufacturer: '', model_number: '', serial_number: '',
        current_quantity: 0, minimum_quantity: 0, maximum_quantity: 100,
        unit_of_measure: 'pieces', unit_cost: 0, supplier_name: '',
        supplier_contact: '', purchase_date: '', expiry_date: '',
        location: '', status: 'active', last_updated_by: '', notes: '', image_path: ''
    });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [showUpdateQuantityModal, setShowUpdateQuantityModal] = useState(false);
    const [quantityUpdateData, setQuantityUpdateData] = useState({ item: null, newQuantity: 0, notes: '' });

    // State to manage which section is currently active for navigation
    const [activeSection, setActiveSection] = useState('inventory'); // Hardcoded for this screen

    // Fetch inventory items from backend
    const fetchInventoryItems = async () => {
      if (!window.electronAPI) return;
      setLoading(true);
      try {
        const filters = {
          search: searchQuery,
          category: categoryFilter,
          status: statusFilter
        };
        const res = await window.electronAPI.getInventoryItems(filters);
        if (res.success) {
          setInventoryItems(res.items);
        } else {
          console.error('Failed to fetch inventory items:', res.error);
        }
      } catch (error) {
        console.error('Error fetching inventory items:', error);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch and real-time listener for inventory items
    React.useEffect(() => {
      fetchInventoryItems();

      if (window.electronAPI) {
        const unsubscribe = window.electronAPI.onIpcEvent('data:update', (payload) => {
          if (payload.table === 'inventory') {
            console.log('Realtime inventory update received:', payload);
            fetchInventoryItems(); // Re-fetch inventory items to reflect changes
          }
        });
        return unsubscribe;
      }
    }, [searchQuery, categoryFilter, statusFilter]); // Re-fetch when filters change
=======
const App = () => {
    // State to manage which section is currently active for navigation
    const [activeSection, setActiveSection] = useState('dashboard');
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9

    // Defines the navigation structure and icons
    const navItems = [
        { id: 'dashboard', icon: 'fas fa-th-large', label: 'Dashboard' },
        { id: 'patients', icon: 'fas fa-users', label: 'Patients' },
        { id: 'messages', icon: 'fas fa-envelope', label: 'Messages' },
        { id: 'tests', icon: 'fas fa-clipboard-check', label: 'Tests' },
        { id: 'inventory', icon: 'fas fa-box-open', label: 'Inventory' },
        { id: 'reports', icon: 'fas fa-chart-bar', label: 'Reports' },
        { id: 'settings', icon: 'fas fa-cog', label: 'Settings' },
        { id: 'logout', icon: 'fas fa-sign-out-alt', label: 'Logout' },
    ];

<<<<<<< HEAD
    const statsData = [
        { label: 'Total Patients', number: '0', icon: 'fas fa-users', color: 'text-blue-500' },
        { label: "Today's Appointments", number: '0', icon: 'fas fa-calendar-check', color: 'text-green-500' },
        { label: 'Pending Appointments', number: '0', icon: 'fas fa-clock', color: 'text-yellow-500' },
        { label: 'Monthly Revenue', number: '₦0', icon: 'fa-solid fa-coins', color: 'text-red-500' },
=======
    // Placeholder data for dashboard stats
    const statsData = [
        // Using old Tailwind color names for mapping to new semantic classes
        { label: 'Total Patients', number: '1,240', icon: 'fas fa-users', color: 'text-blue-500' },
        { label: "Today's Appointments", number: '15', icon: 'fas fa-calendar-check', color: 'text-green-500' },
        { label: 'Pending Appointments', number: '7', icon: 'fas fa-clock', color: 'text-yellow-500' },
        { label: 'Monthly Revenue', number: '₦850,000', icon: 'fa-solid fa-coins', color: 'text-red-500' },
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9
    ];

    // Function to change the active section on click
    const handleNavClick = (sectionId) => {
        if (sectionId === 'logout') {
            // Handle logout action (e.g., clear session/state)
            console.log('User logged out');
        } else {
            setActiveSection(sectionId);
        }
    };

<<<<<<< HEAD
    // Helper functions for CRUD operations
    const handleAddEditItem = async () => {
        if (!window.electronAPI) return;
        setLoading(true);
        try {
            let res;
            if (editingItem) {
                res = await window.electronAPI.updateInventoryItem(editingItem.id, itemFormData);
            } else {
                res = await window.electronAPI.createInventoryItem(itemFormData);
            }

            if (res.success) {
                setShowAddEditModal(false);
                setEditingItem(null);
                setItemFormData({
                    item_code: '', item_name: '', category: '', description: '',
                    manufacturer: '', model_number: '', serial_number: '',
                    current_quantity: 0, minimum_quantity: 0, maximum_quantity: 100,
                    unit_of_measure: 'pieces', unit_cost: 0, supplier_name: '',
                    supplier_contact: '', purchase_date: '', expiry_date: '',
                    location: '', status: 'active', last_updated_by: '', notes: '', image_path: ''
                });
                fetchInventoryItems(); // Re-fetch to update the list
            } else {
                alert(res.error || 'Failed to save inventory item.');
            }
        } catch (error) {
            console.error('Error saving inventory item:', error);
            alert('Error saving inventory item: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteItem = async () => {
        if (!window.electronAPI || !showDeleteConfirm) return;
        setLoading(true);
        try {
            const res = await window.electronAPI.deleteInventoryItem(showDeleteConfirm.id);
            if (res.success) {
                setShowDeleteConfirm(null);
                fetchInventoryItems(); // Re-fetch to update the list
            } else {
                alert(res.error || 'Failed to delete inventory item.');
            }
        } catch (error) {
            console.error('Error deleting inventory item:', error);
            alert('Error deleting inventory item: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateQuantity = async () => {
        if (!window.electronAPI || !quantityUpdateData.item) return;
        setLoading(true);
        try {
            const res = await window.electronAPI.updateInventoryQuantity(
                quantityUpdateData.item.id,
                quantityUpdateData.newQuantity,
                'admin_user_id', // TODO: Replace with actual current user ID
                quantityUpdateData.notes
            );
            if (res.success) {
                setShowUpdateQuantityModal(false);
                setQuantityUpdateData({ item: null, newQuantity: 0, notes: '' });
                fetchInventoryItems(); // Re-fetch to update the list
            } else {
                alert(res.error || 'Failed to update quantity.');
            }
        } catch (error) {
            console.error('Error updating quantity:', error);
            alert('Error updating quantity: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Component to render the Inventory content
    const InventorySection = () => (
        <section id="inventory-section" className="content-section">
            <div className="section-header">
                <h2>INVENTORY</h2>
                <p>Manage medical supplies and equipment</p>
            </div>
            <div className="card">
                <div className="card-controls">
                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Search inventory..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <i className="fas fa-search"></i>
                    </div>
                    <div className="filters">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="dropdown-select"
                        >
                            <option value="">All Categories</option>
                            <option value="equipment">Equipment</option>
                            <option value="supplies">Supplies</option>
                            <option value="medication">Medication</option>
                            <option value="consumables">Consumables</option>
                            <option value="other">Other</option>
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="dropdown-select"
                        >
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="disposed">Disposed</option>
                        </select>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setEditingItem(null);
                            setItemFormData({
                                item_code: '', item_name: '', category: '', description: '',
                                manufacturer: '', model_number: '', serial_number: '',
                                current_quantity: 0, minimum_quantity: 0, maximum_quantity: 100,
                                unit_of_measure: 'pieces', unit_cost: 0, supplier_name: '',
                                supplier_contact: '', purchase_date: '', expiry_date: '',
                                location: '', status: 'active', last_updated_by: '', notes: '', image_path: ''
                            });
                            setShowAddEditModal(true);
                        }}
                    >
                        <i className="fas fa-plus"></i> Add Item
                    </button>
                </div>

                <div className="table-responsive">
                    <table className="min-w-full">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Name</th>
                                <th>Category</th>
                                <th>Current Qty</th>
                                <th>Min Qty</th>
                                <th>Status</th>
                                <th>Expiry Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="text-center text-gray-400 dark:text-gray-500 py-4">Loading inventory...</td>
                                </tr>
                            ) : inventoryItems.length > 0 ? (
                                inventoryItems.map((item) => (
                                    <tr key={item.id}>
                                        <td>{item.item_code}</td>
                                        <td>{item.item_name}</td>
                                        <td>{item.category}</td>
                                        <td>{item.current_quantity}</td>
                                        <td>{item.minimum_quantity}</td>
                                        <td>{item.status}</td>
                                        <td>{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : 'N/A'}</td>
                                        <td className="action-buttons">
                                            <button
                                                className="icon-btn edit"
                                                onClick={() => {
                                                    setEditingItem(item);
                                                    setItemFormData({
                                                        item_code: item.item_code,
                                                        item_name: item.item_name,
                                                        category: item.category,
                                                        description: item.description || '',
                                                        manufacturer: item.manufacturer || '',
                                                        model_number: item.model_number || '',
                                                        serial_number: item.serial_number || '',
                                                        current_quantity: item.current_quantity,
                                                        minimum_quantity: item.minimum_quantity,
                                                        maximum_quantity: item.maximum_quantity,
                                                        unit_of_measure: item.unit_of_measure,
                                                        unit_cost: item.unit_cost,
                                                        supplier_name: item.supplier_name || '',
                                                        supplier_contact: item.supplier_contact || '',
                                                        purchase_date: item.purchase_date || '',
                                                        expiry_date: item.expiry_date || '',
                                                        location: item.location || '',
                                                        status: item.status,
                                                        notes: item.notes || '',
                                                        image_path: item.image_path || ''
                                                    });
                                                    setShowAddEditModal(true);
                                                }}
                                            >
                                                <i className="fas fa-pencil-alt"></i>
                                            </button>
                                            <button
                                                className="icon-btn"
                                                title="Update Quantity"
                                                onClick={() => {
                                                    setQuantityUpdateData({ item: item, newQuantity: item.current_quantity, notes: '' });
                                                    setShowUpdateQuantityModal(true);
                                                }}
                                            >
                                                <i className="fas fa-boxes"></i>
                                            </button>
                                            <button
                                                className="icon-btn delete"
                                                onClick={() => setShowDeleteConfirm(item)}
                                            >
                                                <i className="fas fa-trash-alt"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="text-center text-gray-400 dark:text-gray-500 py-4">No inventory items found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
=======
    // Component to render the Dashboard content
    const DashboardSection = () => (
        <section id="dashboard-section" className="content-section">
            <div className="section-header">
                <h2>DASHBOARD</h2>
                <p>Overview of your eye clinic operations</p>
            </div>
            
            <div className="stats-grid">
                {statsData.map((stat, index) => {
                    const { icon: iconClass, bg: bgClass } = getStatClasses(stat.color);
                    return (
                        <div key={index} className="stat-card">
                            <div className={`stat-icon-wrapper ${bgClass} ${iconClass}`}>
                                <i className={stat.icon}></i>
                            </div>
                            <div className="stat-content">
                                <h3>{stat.label}</h3>
                                <span className="stat-number">{stat.number}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="dashboard-widgets-grid">
                <div className="widget recent-appointments">
                    <div className="widget-header">
                        <h3>Recent Appointments</h3>
                    </div>
                    <div className="empty-state-content">
                        <p>No appointments scheduled for today.</p>
                    </div>
                </div>
                
                <div className="widget">
                    <div className="widget-header">
                        <h3>Quick Actions</h3>
                    </div>
                    <div className="quick-actions">
                        <button className="action-btn btn-primary-action">
                            <i className="fas fa-user-plus"></i>
                            <span>Add Patient</span>
                        </button>
                        <button className="action-btn btn-secondary-action">
                            <i className="fas fa-calendar-plus"></i>
                            <span>Schedule Appointment</span>
                        </button>
                        <button className="action-btn btn-tertiary-action">
                            <i className="fas fa-file-medical"></i>
                            <span>New Examination</span>
                        </button>
                    </div>
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9
                </div>
            </div>
        </section>
    );

<<<<<<< HEAD
=======
    // Component to render the Patients content
    const PatientsSection = () => (
        <section id="patients-section" className="content-section">
            <div className="section-header">
                <h2>PATIENTS</h2>
                <p>Manage patient information and records</p>
            </div>
            <div className="widget">
                <div className="empty-state-content">
                    <p>Patient management functionality coming soon...</p>
                </div>
            </div>
        </section>
    );
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9

    // Main render function
    return (
        <>
            <AppStyles /> 
            
            <div className="app-container">
                {/* Header */}
                <header className="app-header">
                    <div className="header-content">
                        <div className="logo">
                            <i className="fas fa-eye"></i>
                            <h1>KORENE EYE CLINIC</h1>
                        </div>
                        <div className="header-actions">
                            <div className="user-info">
                                <img 
                                    src="https://placehold.co/30x30/6c757d/ffffff?text=A" 
                                    alt="Admin Avatar" 
                                    className="avatar" 
                                    onError={(e) => {e.target.onerror = null; e.target.src='https://placehold.co/30x30/6c757d/ffffff?text=A'}} 
                                /> 
<<<<<<< HEAD
                                <span className="hidden-on-mobile">{user?.name || 'Admin'}</span>
=======
                                <span className="hidden-on-mobile">Admin</span>
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <div className="main-content-wrapper">
                    {/* Sidebar Navigation */}
                    <nav className="sidebar">
                        <ul className="nav-menu">
                            {navItems.map((item) => (
                                <li key={item.id} className={`nav-item ${activeSection === item.id ? 'active' : ''}`}>
                                    <a 
                                        href={`#${item.id}`} 
                                        className="nav-link"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleNavClick(item.id);
                                        }}
                                    >
                                        <i className={item.icon}></i>
                                        <span>{item.label}</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* Content Area */}
                    <div className="content-area">
<<<<<<< HEAD
                        {activeSection === 'inventory' && <InventorySection />}
                        {activeSection !== 'inventory' && (
                            <div className="widget">
                                <div className="empty-state-content">
                                    <p>Content for the **{activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}** section is not yet implemented in this view.</p>
=======
                        {activeSection === 'dashboard' && <DashboardSection />}
                        {activeSection === 'patients' && <PatientsSection />}
                        {activeSection !== 'dashboard' && activeSection !== 'patients' && (
                            <div className="widget">
                                <div className="empty-state-content">
                                    <p>Content for the **{activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}** section is not yet implemented.</p>
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
<<<<<<< HEAD

            {/* Add/Edit Item Modal */}
            {showAddEditModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4 dark:text-white">{editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}</h3>
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Item Code"
                                value={itemFormData.item_code}
                                onChange={(e) => setItemFormData({ ...itemFormData, item_code: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                            />
                            <input
                                type="text"
                                placeholder="Item Name"
                                value={itemFormData.item_name}
                                onChange={(e) => setItemFormData({ ...itemFormData, item_name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                            />
                            <select
                                value={itemFormData.category}
                                onChange={(e) => setItemFormData({ ...itemFormData, category: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                            >
                                <option value="">Select Category</option>
                                <option value="equipment">Equipment</option>
                                <option value="supplies">Supplies</option>
                                <option value="medication">Medication</option>
                                <option value="consumables">Consumables</option>
                                <option value="other">Other</option>
                            </select>
                            <textarea
                                placeholder="Description"
                                value={itemFormData.description}
                                onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                            />
                            <input
                                type="number"
                                placeholder="Current Quantity"
                                value={itemFormData.current_quantity}
                                onChange={(e) => setItemFormData({ ...itemFormData, current_quantity: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                            />
                            <input
                                type="number"
                                placeholder="Minimum Quantity"
                                value={itemFormData.minimum_quantity}
                                onChange={(e) => setItemFormData({ ...itemFormData, minimum_quantity: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                            />
                             <input
                                type="date"
                                placeholder="Expiry Date"
                                value={itemFormData.expiry_date}
                                onChange={(e) => setItemFormData({ ...itemFormData, expiry_date: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                            />
                        </div>
                        <div className="flex justify-end space-x-2 mt-6">
                            <button
                                onClick={() => {
                                    setShowAddEditModal(false);
                                    setEditingItem(null);
                                    setItemFormData({
                                        item_code: '', item_name: '', category: '', description: '',
                                        manufacturer: '', model_number: '', serial_number: '',
                                        current_quantity: 0, minimum_quantity: 0, maximum_quantity: 100,
                                        unit_of_measure: 'pieces', unit_cost: 0, supplier_name: '',
                                        supplier_contact: '', purchase_date: '', expiry_date: '',
                                        location: '', status: 'active', last_updated_by: '', notes: '', image_path: ''
                                    });
                                }}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddEditItem}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                {editingItem ? 'Update' : 'Add'} Item
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Update Quantity Modal */}
            {showUpdateQuantityModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4 dark:text-white">Update Quantity for {quantityUpdateData.item?.item_name}</h3>
                        <div className="space-y-4">
                            <input
                                type="number"
                                placeholder="New Quantity"
                                value={quantityUpdateData.newQuantity}
                                onChange={(e) => setQuantityUpdateData({ ...quantityUpdateData, newQuantity: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                            />
                            <textarea
                                placeholder="Notes (e.g., 'Stock adjustment', 'Used in surgery')"
                                value={quantityUpdateData.notes}
                                onChange={(e) => setQuantityUpdateData({ ...quantityUpdateData, notes: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                            />
                        </div>
                        <div className="flex justify-end space-x-2 mt-6">
                            <button
                                onClick={() => setShowUpdateQuantityModal(false)}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateQuantity}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Update Quantity
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4 dark:text-white">Delete Inventory Item</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">Are you sure you want to delete {showDeleteConfirm.item_name} ({showDeleteConfirm.item_code})?</p>
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteItem}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
=======
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9
        </>
    );
};

<<<<<<< HEAD
export default InventoryScreen;
};

=======
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9
export default App;
