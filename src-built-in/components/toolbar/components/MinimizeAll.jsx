import React from "react";
import { FinsembleButton } from "@chartiq/finsemble-react-controls";


const MinimizeAll = (props) => {
	const MinimizeAll = () => {
		FSBL.Clients.WorkspaceClient.minimizeAll();
	}
	let wrapperClasses = props.classes + " icon-only window-mgmt-left";

	return (
		<FinsembleButton className={wrapperClasses} buttonType={["Toolbar"]} title="Minimize All" onClick={MinimizeAll}>
			<span>
				<svg width="16px" height="16px" viewBox="0 0 16 16" version="1.1" xmlns="http://www.w3.org/2000/svg">
					<title>Minimize All</title>
					<g id="Symbols" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
						<g id="atoms/icons/collapse" transform="translate(-9.000000, -9.000000)">
							<g id="collapse-windows" transform="translate(9.000000, 9.000000)">
								<path d="M11,12 L11,11 L15,11 L15,1 L5,1 L5,5 L4,5 L4,8 L4,1 C4,0.44771525 4.44771525,1.01453063e-16 5,0 L15,0 C15.5522847,-1.01453063e-16 16,0.44771525 16,1 L16,11 C16,11.5522847 15.5522847,12 15,12 L11,12 Z" id="Combined-Shape" fill="#8E939F"></path>
								<path d="M7,14 L7,13 L11,13 L11,5 L3,5 L3,9 L2,9 L2,11 L2,5 C2,4.44771525 2.44771525,4 3,4 L11,4 C11.5522847,4 12,4.44771525 12,5 L12,13 C12,13.5522847 11.5522847,14 11,14 L7,14 Z" id="Combined-Shape" fill="#C6C9CF"></path>
								<path d="M1,8 L7,8 C7.55228475,8 8,8.44771525 8,9 L8,15 C8,15.5522847 7.55228475,16 7,16 L1,16 C0.44771525,16 6.76353751e-17,15.5522847 0,15 L0,9 C-6.76353751e-17,8.44771525 0.44771525,8 1,8 Z M1,9 L1,15 L7,15 L7,9 L1,9 Z" id="Combined-Shape" fill="#FFFFFF"></path>
							</g>
						</g>
					</g>
				</svg>
			</span>
		</FinsembleButton>
	)
};

export default MinimizeAll;