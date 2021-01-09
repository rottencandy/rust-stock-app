type Item = {
    id: number;
    name: string;
    company: string;
    amount: string;
};

type Payload = {
    cmd: 'get' | 'insert' | 'update' | 'delete';
    data: null | Item;
};

type IResponse = {
    cmd: Payload['cmd'];
    value: null | Item[];
};

const makeCall = (stuff: any) => (external as any).invoke(JSON.stringify(stuff));

/**
 * Global state for storing fetched data
 */
let Data: Item[] = [];

const sendMessage = (cmd: Payload['cmd'], data: Payload['data'] = null) => {
    let payload: Payload = {
        cmd,
        data,
    }
    makeCall(payload);
};

/**
 * To be run by backed function, name *MUST* not be mangled!
 */
const recieveData = (x: IResponse) => {
    switch (x.cmd) {
        case 'get':
            Data = x.value;
            fillColumns();
            break;
    }
};

/**
 * Simple wrapper around `document.getElementBYId()`.
 */
const getEle = (id: string) => document.getElementById(id);

const searchBar = getEle('input') as HTMLInputElement;
const newButton = getEle('new');
const columns = getEle('columns');

const modalTitle = getEle('modalTitle');
const modalInputName = getEle('modalInputName') as HTMLInputElement;
const modalInputCompany = getEle('modalInputCompany') as HTMLInputElement;
const modalInputAmount = getEle('modalInputAmount') as HTMLInputElement;
const modalSave = getEle('modalSave');
const modalDelete = getEle('modalDelete');

// mini.css conrols the modal using this checkbox element
const modalControl = getEle('modal-control') as HTMLInputElement;
const openModal = () => (modalControl.checked = true);
const closeModal = () => (modalControl.checked = false);

searchBar.oninput = (e: any) => {
    const val: string = e.target.value.toLowerCase();
    Data.forEach((item) => {
        const id = item.id.toString();
        if (val === '') {
            getEle(id).style.display = '';
            return;
        }
        if (item.name.toLowerCase().includes(val) || item.company.toLowerCase().includes(val)) {
            getEle(id).style.display = '';
        } else {
            getEle(id).style.display = 'none';
        }
    });
};

const fillColumns = () => {
    columns.innerHTML = '';
    columns.append(...Data.map((item, i) => {
        const row = document.createElement('tr');
        row.id = item.id.toString();
        row.onclick = () => {
            openModal();
            modalTitle.textContent = `Edit ${item.name}`;
            modalInputName.value = item.name;
            modalInputCompany.value = item.company;
            modalInputAmount.value = item.amount;

            modalSave.onclick = () => {
                sendMessage('update', {
                    id: item.id,
                    name: modalInputName.value,
                    company: modalInputCompany.value,
                    amount: modalInputAmount.value
                });
                closeModal();
                sendMessage('get');
            };

            modalDelete.style.display = '';
            modalDelete.onclick = () => {
                sendMessage('delete', {
                    id: item.id,
                    name: '',
                    company: '',
                    amount: ''
                });
                closeModal();
                sendMessage('get');
            };
        };
        row.innerHTML = `
  <td data-label="No.">${i + 1}</td>
  <td data-label="Name">${item.name}</td>
  <td data-label="Company">${item.company}</td>
  <td data-label="Amount">${item.amount}</td>`;
        return row;
    }));
};

newButton.onclick = () => {
    openModal();
    modalTitle.textContent = 'Add Item';
    modalInputName.value = '';
    modalInputCompany.value = '';
    modalInputAmount.value = '';
    modalDelete.style.display = 'none';

    modalSave.onclick = () => {
        sendMessage('insert', {
            id: 0,
            name: modalInputName.value,
            company: modalInputCompany.value,
            amount: modalInputAmount.value
        });
        closeModal();
        sendMessage('get');
    };
};

sendMessage('get');
