/*
Copyright IBM Corp. 2016 All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

		 http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

// Transaction defines a function call to a contract.
// `args` is an array of type string so that the chaincode writer can choose
// whatever format they wish for the arguments for their chaincode.
// For example, they may wish to use JSON, XML, or a custom format.
// TODO: Defined remaining fields.
message Transaction {
    enum Type {
        UNDEFINED = 0;
        // deploy a chaincode to the network and call `Init` function
        CHAINCODE_DEPLOY = 1;
        // call a chaincode `Invoke` function as a transaction
        CHAINCODE_INVOKE = 2;
        // call a chaincode `query` function
        CHAINCODE_QUERY = 3;
        // terminate a chaincode; not implemented yet
        CHAINCODE_TERMINATE = 4;
    }
    Type type = 1;
    //store ChaincodeID as bytes so its encrypted value can be stored
    bytes chaincodeID = 2;
    bytes payload = 3;
    bytes metadata = 4;
    string uuid = 5;
    google.protobuf.Timestamp timestamp = 6;

    ConfidentialityLevel confidentialityLevel = 7;
    string confidentialityProtocolVersion = 8;
    bytes nonce = 9;

    bytes toValidators = 10;
    bytes cert = 11;
    bytes signature = 12;
}

// TransactionBlock carries a batch of transactions.
message TransactionBlock {
    repeated Transaction transactions = 1;
}

// TransactionResult contains the return value of a transaction. It does
// not track potential state changes that were a result of the transaction.
// uuid - The unique identifier of this transaction.
// result - The return value of the transaction.
// errorCode - An error code. 5xx will be logged as a failure in the dashboard.
// error - An error string for logging an issue.
// chaincodeEvent - any event emitted by a transaction
message TransactionResult {
  string uuid = 1;
  bytes result = 2;
  uint32 errorCode = 3;
  string error = 4;
  ChaincodeEvent chaincodeEvent = 5;
}

// Block carries The data that describes a block in the blockchain.
// version - Version used to track any protocol changes.
// timestamp - The time at which the block or transaction order
// was proposed. This may not be used by all consensus modules.
// transactions - The ordered list of transactions in the block.
// stateHash - The state hash after running transactions in this block.
// previousBlockHash - The hash of the previous block in the chain.
// consensusMetadata - Consensus modules may optionally store any
// additional metadata in this field.
// nonHashData - Data stored with the block, but not included in the blocks
// hash. This allows this data to be different per peer or discarded without
// impacting the blockchain.
message Block {
    uint32 version = 1;
    google.protobuf.Timestamp timestamp = 2;
    repeated Transaction transactions = 3;
    bytes stateHash = 4;
    bytes previousBlockHash = 5;
    bytes consensusMetadata = 6;
    NonHashData nonHashData = 7;
}

// Contains information about the blockchain ledger such as height, current
// block hash, and previous block hash.
message BlockchainInfo {

    uint64 height = 1;
    bytes currentBlockHash = 2;
    bytes previousBlockHash = 3;

}

// NonHashData is data that is recorded on the block, but not included in
// the block hash when verifying the blockchain.
// localLedgerCommitTimestamp - The time at which the block was added
// to the ledger on the local peer.
// transactionResults - The results of transactions.
message NonHashData {
    google.protobuf.Timestamp localLedgerCommitTimestamp = 1;
    repeated TransactionResult transactionResults = 2;
}

// Interface exported by the server.
service Peer {
    // Accepts a stream of Message during chat session, while receiving
    // other Message (e.g. from other peers).
    rpc Chat(stream Message) returns (stream Message) {}

    // Process a transaction from a remote source.
    rpc ProcessTransaction(Transaction) returns (Response) {}

}

message PeerAddress {
    string host = 1;
    int32 port = 2;
}

message PeerID {
    string name = 1;
}

message PeerEndpoint {
    PeerID ID = 1;
    string address = 2;
    enum Type {
      UNDEFINED = 0;
      VALIDATOR = 1;
      NON_VALIDATOR = 2;
    }
    Type type = 3;
    bytes pkiID = 4;
}

message PeersMessage {
    repeated PeerEndpoint peers = 1;
}

message PeersAddresses {
    repeated string addresses = 1;
}

message HelloMessage {
  PeerEndpoint peerEndpoint = 1;
  BlockchainInfo blockchainInfo = 2;
}

message Message {
    enum Type {
        UNDEFINED = 0;

        DISC_HELLO = 1;
        DISC_DISCONNECT = 2;
        DISC_GET_PEERS = 3;
        DISC_PEERS = 4;
        DISC_NEWMSG = 5;

        CHAIN_TRANSACTION = 6;

        SYNC_GET_BLOCKS = 11;
        SYNC_BLOCKS = 12;
        SYNC_BLOCK_ADDED = 13;

        SYNC_STATE_GET_SNAPSHOT = 14;
        SYNC_STATE_SNAPSHOT = 15;
        SYNC_STATE_GET_DELTAS = 16;
        SYNC_STATE_DELTAS = 17;

        RESPONSE = 20;
        CONSENSUS = 21;
    }
    Type type = 1;
    google.protobuf.Timestamp timestamp = 2;
    bytes payload = 3;
    bytes signature = 4;
}

message Response {
    enum StatusCode {
        UNDEFINED = 0;
        SUCCESS = 200;
        FAILURE = 500;
    }
    StatusCode status = 1;
    bytes msg = 2;
}

// BlockState is the payload of Message.SYNC_BLOCK_ADDED. When a VP
// commits a new block to the ledger, it will notify its connected NVPs of the
// block and the delta state. The NVP may call the ledger APIs to apply the
// block and the delta state to its ledger if the block's previousBlockHash
// equals to the NVP's current block hash
message BlockState {
    Block block = 1;
    bytes stateDelta = 2;
}

// SyncBlockRange is the payload of Message.SYNC_GET_BLOCKS, where
// start and end indicate the starting and ending blocks inclusively. The order
// in which blocks are returned is defined by the start and end values. For
// example, if start=3 and end=5, the order of blocks will be 3, 4, 5.
// If start=5 and end=3, the order will be 5, 4, 3.
message SyncBlockRange {
    uint64 correlationId = 1;
    uint64 start = 2;
    uint64 end = 3;
}

// SyncBlocks is the payload of Message.SYNC_BLOCKS, where the range
// indicates the blocks responded to the request SYNC_GET_BLOCKS
message SyncBlocks {
    SyncBlockRange range = 1;
    repeated Block blocks = 2;
}

// SyncSnapshotRequest Payload for the penchainMessage.SYNC_GET_SNAPSHOT message.
message SyncStateSnapshotRequest {
  uint64 correlationId = 1;
}

// SyncState is the payload of Message.SYNC_SNAPSHOT, which is a response
// to penchainMessage.SYNC_GET_SNAPSHOT. It contains the snapshot or a chunk of the
// snapshot on stream, and in which case, the sequence indicate the order
// starting at 0.  The terminating message will have len(delta) == 0.
message SyncStateSnapshot {
    bytes delta = 1;
    uint64 sequence = 2;
    uint64 blockNumber = 3;
    SyncStateSnapshotRequest request = 4;
}

// SyncStateRequest is the payload of Message.SYNC_GET_STATE.
// blockNumber indicates the block number for the delta which is being
// requested. If no payload is included with SYNC_GET_STATE, it represents
// a request for a snapshot of the current state.
message SyncStateDeltasRequest {
    SyncBlockRange range = 1;
}

// SyncStateDeltas is the payload of the Message.SYNC_STATE in response to
// the Message.SYNC_GET_STATE message.
message SyncStateDeltas {
    SyncBlockRange range = 1;
    repeated bytes deltas = 2;
}

//Chaincode is used for events and registrations that are specific to chaincode
//string type - "chaincode"
message ChaincodeEvent {
      string chaincodeID = 1;
      string txID = 2;
      string eventName = 3;
      bytes payload = 4;
}

//----Event objects----

enum EventType {
        REGISTER = 0;
        BLOCK = 1;
	CHAINCODE = 2;
}

//ChaincodeReg is used for registering chaincode Interests
//when EventType is CHAINCODE
message ChaincodeReg {
    string chaincodeID = 1;
    string eventName = 2;
}

message Interest {
    EventType eventType = 1;
    //Ideally we should just have the following oneof for different
    //Reg types and get rid of EventType. But this is an API change
    //Additional Reg types may add messages specific to their type
    //to the oneof.
    oneof RegInfo {
        ChaincodeReg chaincodeRegInfo = 2;
    }
}

//---------- consumer events ---------
//Register is sent by consumers for registering events
//string type - "register"
message Register {
    repeated Interest events = 1;
}

//Event is used by
//  - consumers (adapters) to send Register
//  - producer to advertise supported types and events
message Event {
    //TODO need timestamp

    oneof Event {
        //consumer events
        Register register = 1;

        //producer events
        Block block = 2;
        ChaincodeEvent chaincodeEvent = 3;
    }
}

// Interface exported by the events server
service Events {
    // event chatting using Event
    rpc Chat(stream Event) returns (stream Event) {}
}