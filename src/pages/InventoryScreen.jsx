import React, { useState, useEffect } from 'react';
import useUser from '../hooks/useUser';
import useInventory from '../hooks/useInventory';
import Layout from '../components/layout/Layout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';

const InventoryScreen = () => {
    const { user } = useUser();
    const {
        inventoryItems,
        loading,
        // error, // Can display error if needed
        fetchInventoryItems,
        addItem,
        updateItem,
        deleteItem,
        updateQuantity
    } = useInventory();

    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Modal State
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

    // Layout State
    const [activeSection, setActiveSection] = useState('inventory');

    // --- Fetching Logic ---
    useEffect(() => {
        const filters = {
            search: searchQuery,
            category: categoryFilter,
            status: statusFilter
        };
        fetchInventoryItems(filters);

        // Listen for real-time updates
        if (window.electronAPI) {
            const unsubscribe = window.electronAPI.onIpcEvent('data:update', (payload) => {
                if (payload.table === 'inventory') {
                    fetchInventoryItems(filters);
                }
            });
            return unsubscribe;
        }
    }, [searchQuery, categoryFilter, statusFilter, fetchInventoryItems]);

    // --- Handlers ---
    const handleNavClick = (sectionId) => {
        setActiveSection(sectionId);
    };

    const handleActionClick = () => {
        setEditingItem(null);
        resetFormData();
        setShowAddEditModal(true);
    };

    const resetFormData = () => {
        setItemFormData({
            item_code: '', item_name: '', category: '', description: '',
            manufacturer: '', model_number: '', serial_number: '',
            current_quantity: 0, minimum_quantity: 0, maximum_quantity: 100,
            unit_of_measure: 'pieces', unit_cost: 0, supplier_name: '',
            supplier_contact: '', purchase_date: '', expiry_date: '',
            location: '', status: 'active', last_updated_by: '', notes: '', image_path: ''
        });
    };

    const handleAddEditItem = async () => {
        let success;
        if (editingItem) {
            success = await updateItem(editingItem.id, itemFormData);
        } else {
            success = await addItem(itemFormData);
        }

        if (success) {
            setShowAddEditModal(false);
            setEditingItem(null);
            resetFormData();
            // Refetch is handled by state update in hook + possibly event, but no harm ensuring
        } else {
            alert('Failed to save inventory item.');
        }
    };

    const handleDeleteItem = async () => {
        if (!showDeleteConfirm) return;
        const success = await deleteItem(showDeleteConfirm.id);
        if (success) {
            setShowDeleteConfirm(null);
        } else {
            alert('Failed to delete inventory item.');
        }
    };

    const handleUpdateQuantity = async () => {
        if (!quantityUpdateData.item) return;
        const success = await updateQuantity(
            quantityUpdateData.item.id,
            quantityUpdateData.newQuantity,
            user?.id || 'admin_user_id',
            quantityUpdateData.notes
        );

        if (success) {
            setShowUpdateQuantityModal(false);
            setQuantityUpdateData({ item: null, newQuantity: 0, notes: '' });
        } else {
            alert('Failed to update quantity.');
        }
    };

    const getStatusBadgeVariant = (status) => {
        switch (status?.toLowerCase()) {
            case 'active': return 'success';
            case 'inactive': return 'default';
            case 'maintenance': return 'warning';
            case 'disposed': return 'danger';
            default: return 'default';
        }
    };

    return (
        <Layout
            activeSection={activeSection}
            onSectionClick={handleNavClick}
            searchTerm={searchQuery}
            onSearchChange={setSearchQuery}
            onActionClick={handleActionClick}
        >
            <div className="space-y-6">
                {/* Header / Actions */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Inventory Management</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Manage medical supplies and equipment</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Select
                            containerClassName="w-40"
                            placeholder="All Categories"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            options={[
                                { value: 'equipment', label: 'Equipment' },
                                { value: 'supplies', label: 'Supplies' },
                                { value: 'medication', label: 'Medication' },
                                { value: 'consumables', label: 'Consumables' },
                                { value: 'other', label: 'Other' },
                            ]}
                        />
                        <Select
                            containerClassName="w-40"
                            placeholder="All Statuses"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            options={[
                                { value: 'active', label: 'Active' },
                                { value: 'inactive', label: 'Inactive' },
                                { value: 'maintenance', label: 'Maintenance' },
                                { value: 'disposed', label: 'Disposed' },
                            ]}
                        />
                        <Button
                            onClick={handleActionClick}
                            icon={<i className="fas fa-plus"></i>}
                        >
                            Add Item
                        </Button>
                    </div>
                </div>

                {/* Inventory Table */}
                <Card noPadding className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-750">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Code</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Qty</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Min Qty</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expiry</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {loading && inventoryItems.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-10 text-center text-gray-500">Loading...</td>
                                    </tr>
                                ) : inventoryItems.length > 0 ? (
                                    inventoryItems.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{item.item_code}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{item.item_name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">{item.category}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">{item.current_quantity}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.minimum_quantity}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge variant={getStatusBadgeVariant(item.status)} className="capitalize">
                                                    {item.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingItem(item);
                                                        setItemFormData({ ...item });
                                                        setShowAddEditModal(true);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                                    title="Edit"
                                                >
                                                    <i className="fas fa-pencil-alt"></i>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setQuantityUpdateData({ item: item, newQuantity: item.current_quantity, notes: '' });
                                                        setShowUpdateQuantityModal(true);
                                                    }}
                                                    className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                                    title="Update Stock"
                                                >
                                                    <i className="fas fa-boxes"></i>
                                                </button>
                                                <button
                                                    onClick={() => setShowDeleteConfirm(item)}
                                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                    title="Delete"
                                                >
                                                    <i className="fas fa-trash-alt"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                                            No inventory items found matching your filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* --- Modals --- */}

            {/* Add/Edit Modal */}
            <Modal
                isOpen={showAddEditModal}
                onClose={() => setShowAddEditModal(false)}
                title={editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
                size="lg"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setShowAddEditModal(false)}>Cancel</Button>
                        <Button onClick={handleAddEditItem}>{editingItem ? 'Update' : 'Create'} Item</Button>
                    </>
                }
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Item Code"
                        placeholder="e.g. EQ-001"
                        value={itemFormData.item_code}
                        onChange={(e) => setItemFormData({ ...itemFormData, item_code: e.target.value })}
                    />
                    <Input
                        label="Item Name"
                        placeholder="e.g. Slit Lamp"
                        value={itemFormData.item_name}
                        onChange={(e) => setItemFormData({ ...itemFormData, item_name: e.target.value })}
                    />
                    <Select
                        label="Category"
                        value={itemFormData.category}
                        onChange={(e) => setItemFormData({ ...itemFormData, category: e.target.value })}
                        options={[
                            { value: 'equipment', label: 'Equipment' },
                            { value: 'supplies', label: 'Supplies' },
                            { value: 'medication', label: 'Medication' },
                            { value: 'consumables', label: 'Consumables' },
                            { value: 'other', label: 'Other' },
                        ]}
                    />
                    <Select
                        label="Status"
                        value={itemFormData.status}
                        onChange={(e) => setItemFormData({ ...itemFormData, status: e.target.value })}
                        options={[
                            { value: 'active', label: 'Active' },
                            { value: 'inactive', label: 'Inactive' },
                            { value: 'maintenance', label: 'Maintenance' },
                            { value: 'disposed', label: 'Disposed' },
                        ]}
                    />
                    <Input
                        label="Current Quantity"
                        type="number"
                        value={itemFormData.current_quantity}
                        onChange={(e) => setItemFormData({ ...itemFormData, current_quantity: parseInt(e.target.value) || 0 })}
                    />
                    <Input
                        label="Minimum Quantity"
                        type="number"
                        value={itemFormData.minimum_quantity}
                        onChange={(e) => setItemFormData({ ...itemFormData, minimum_quantity: parseInt(e.target.value) || 0 })}
                    />
                    <Input
                        label="Unit of Measure"
                        value={itemFormData.unit_of_measure}
                        onChange={(e) => setItemFormData({ ...itemFormData, unit_of_measure: e.target.value })}
                    />
                    <Input
                        label="Unit Cost"
                        type="number"
                        value={itemFormData.unit_cost}
                        onChange={(e) => setItemFormData({ ...itemFormData, unit_cost: parseFloat(e.target.value) || 0 })}
                    />
                    <Input
                        label="Expiry Date"
                        type="date"
                        value={itemFormData.expiry_date}
                        onChange={(e) => setItemFormData({ ...itemFormData, expiry_date: e.target.value })}
                    />
                    <Input
                        label="Location"
                        placeholder="e.g. Shelf A1"
                        value={itemFormData.location}
                        onChange={(e) => setItemFormData({ ...itemFormData, location: e.target.value })}
                    />
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                        <textarea
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24"
                            value={itemFormData.description}
                            onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                        ></textarea>
                    </div>
                </div>
            </Modal>

            {/* Update Quantity Modal */}
            <Modal
                isOpen={showUpdateQuantityModal}
                onClose={() => setShowUpdateQuantityModal(false)}
                title="Update Stock Quantity"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setShowUpdateQuantityModal(false)}>Cancel</Button>
                        <Button onClick={handleUpdateQuantity}>Save Changes</Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Updating stock for: <span className="font-semibold text-gray-800 dark:text-white">{quantityUpdateData.item?.item_name}</span>
                    </p>
                    <Input
                        label="New Quantity"
                        type="number"
                        value={quantityUpdateData.newQuantity}
                        onChange={(e) => setQuantityUpdateData({ ...quantityUpdateData, newQuantity: parseInt(e.target.value) || 0 })}
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason / Notes</label>
                        <textarea
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-20"
                            placeholder="e.g. Stock count adjustment, New shipment received"
                            value={quantityUpdateData.notes}
                            onChange={(e) => setQuantityUpdateData({ ...quantityUpdateData, notes: e.target.value })}
                        ></textarea>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(null)}
                title="Delete Item"
                size="sm"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
                        <Button variant="danger" onClick={handleDeleteItem}>Delete</Button>
                    </>
                }
            >
                <div className="text-center">
                    <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full inline-block mb-3">
                        <i className="fas fa-exclamation-triangle text-red-600 dark:text-red-400 text-xl"></i>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">
                        Are you sure you want to delete <strong>{showDeleteConfirm?.item_name}</strong>? This action cannot be undone.
                    </p>
                </div>
            </Modal>
        </Layout>
    );
};

export default InventoryScreen;
