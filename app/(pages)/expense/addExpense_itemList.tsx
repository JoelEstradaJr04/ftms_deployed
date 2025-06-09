// //import React, {useState, useEffect} from 'react';
// import '../styles/addExpense_itemList.css';
// import { Item } from '../utility/calcAmount';

// type ItemListProps = {
//     items: Item[];
//     readOnly?: boolean; // Add this line
//     setItems?: React.Dispatch<React.SetStateAction<Item[]>>;
// };

// const AddExpenseItemList: React.FC<ItemListProps> = ({ items, setItems, readOnly }) => {

//     //event Change handler
//     const handleChange = (index: number, field: keyof Item, value: string) => {
//         if (readOnly || !setItems) return;

//         const updated = [...items];

//         updated[index][field] = value;

//         setItems(updated);

//         // Add a new row if it's the last row and not empty
//         if (
//             index === items.length - 1 &&
//             (field === 'name' || field === 'unitPrice' || field === 'quantity') &&
//             value.trim() !== ''
//         ) {
//             setItems([...updated, { name: '', unitPrice: '', quantity: '' }]);
//         }
//     };


//     //Compute total per Item
//     const totalComputation = (price: string, quantity: string) => {
//         const p = parseFloat(price);
//         const q = parseFloat(quantity);
//         return isNaN(p) || isNaN(q) ? '' : (p * q).toFixed(2);
//     };

//     //Compute GrandTotal
//     const grandTotal = items.reduce((sum, item) => {
//         const total =   parseFloat(totalComputation(item.unitPrice, item.quantity));
//         return sum + (isNaN(total) ? 0 : total);
//     }, 0)

//   return (
//     <div className='tableContainer'>
//         <table className='itemList'>
//             <thead>
//                 <tr>
//                     <th>Items</th>
//                     <th>Price</th>
//                     <th>Quantity</th>
//                     <th>Total</th>
//                 </tr>
//             </thead>
//         </table>

//             <div className='scrollable-tbody'>
//                 <table className='itemList'>
//                     <tbody>
//                         {
//                             items.map((item, idx) => (
//                                 <tr key={idx} className={item.name || item.unitPrice || item.quantity ? '' : 'translucent'}>
//                                     <td><input type='text' value={item.name} onChange={(e) => handleChange(idx, 'name', e.target.value)} readOnly={readOnly}/></td>
//                                     <td><input type='number' value={item.unitPrice} onChange={(e) => handleChange(idx, 'unitPrice', e.target.value)} readOnly={readOnly}/></td>
//                                     <td><input type='number' value={item.quantity} onChange={(e) => handleChange(idx, 'quantity', e.target.value)} readOnly={readOnly}/></td>
//                                     <td>{totalComputation(item.unitPrice, item.quantity)}</td>
//                                 </tr>
//                             ))
//                         }
//                     </tbody>
//                 </table>
                
//             </div>
//         <hr/>
//         <table className='tableContainer'>
//             <tbody className='grandTotal'>
//                 <tr>
//                     <td><h3>Total:</h3></td>
//                     <td></td>
//                     <td></td>
//                     <td><h3>{grandTotal.toFixed(2)}</h3></td>
//                 </tr>
//             </tbody>
//         </table>
//     </div>
//   )
// }

// export default AddExpenseItemList