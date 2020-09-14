#include <algorithm>
#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <map>
#include <vector>
#include <string.h>
#include <node_api.h>

extern "C" {
    #include "cluster.h"
}

using namespace std;

class TreeNode {
    public:
        int NodeId;
        int Height;
        vector<int> Indices;
        vector<TreeNode*> Children;

        string Label;
        vector<double> Values;

        virtual ~TreeNode() {}
        virtual napi_status napify(napi_env env, napi_value* napi_tree_result) {

            napi_status status;

            status = napi_create_object(env, napi_tree_result);
            if (status != napi_ok) {
                napi_throw_error(env, NULL, "Failed to create napi object");
            }

            // Creating napi keys
            string current_napi_key_name;
            current_napi_key_name = "name";
            napi_value napi_name_key;
            status = napi_create_string_utf8(env, current_napi_key_name.c_str(), current_napi_key_name.length(), &napi_name_key);       
            current_napi_key_name = "height";
            napi_value napi_height_key;
            status = napi_create_string_utf8(env, current_napi_key_name.c_str(), current_napi_key_name.length(), &napi_height_key);
            current_napi_key_name = "indexes";
            napi_value napi_indices_key;
            status = napi_create_string_utf8(env, current_napi_key_name.c_str(), current_napi_key_name.length(), &napi_indices_key);
            current_napi_key_name = "children";
            napi_value napi_children_key;
            status = napi_create_string_utf8(env, current_napi_key_name.c_str(), current_napi_key_name.length(), &napi_children_key);

            // Creating napi values
            napi_value napi_name_val;
            status = napi_create_string_utf8(env, Label.c_str(), Label.length(), &napi_name_val);
            
            napi_value napi_height_val;
            status = napi_create_int64(env, Height, &napi_height_val);
            napi_value napi_indices_val;
            status = napi_create_array(env, &napi_indices_val);
            for (unsigned i = 0; i < Indices.size(); i++) {
                napi_value cur_item;
                status = napi_create_int64(env, Indices.at(i), &cur_item);
                status = napi_set_element(env, napi_indices_val, i, cur_item);
            }
            napi_value napi_children_val;
            status = napi_create_array(env, &napi_children_val);
            for (unsigned i = 0; i < Children.size(); i++) {
                napi_value cur_child;
                status = Children.at(i)->napify(env, &cur_child);       
                status = napi_set_element(env, napi_children_val, i, cur_child);
            }

            // Setting keys and values for return
            status = napi_set_property(env, *napi_tree_result, napi_name_key, napi_name_val);         
            status = napi_set_property(env, *napi_tree_result, napi_height_key, napi_height_val);
            status = napi_set_property(env, *napi_tree_result, napi_indices_key, napi_indices_val);            
            status = napi_set_property(env, *napi_tree_result, napi_children_key, napi_children_val);

            if (NodeId >= 0) {
                current_napi_key_name = "values";
                napi_value napi_values_key;
                status = napi_create_string_utf8(env, current_napi_key_name.c_str(), current_napi_key_name.length(), &napi_values_key);
                napi_value napi_values_val;
                status = napi_create_array(env, &napi_values_val);
                for (unsigned i = 0; i < Children.size(); i++) {
                    napi_value cur_item;
                    status = napi_create_double(env, Values.at(i), &cur_item);
                    status = napi_set_element(env, napi_values_val, i, cur_item);
                    status = napi_set_property(env, *napi_tree_result, napi_values_key, napi_values_val);
                }
            }
            return status;
        }

        string stringify() {

            string children = "";
            // need to account for cases where leaves are missing
            for (TreeNode* t : Children) {
                string current_string = t->stringify();
                children += current_string;
                children += ",";
            }
            if (children != ""){
                children.pop_back();
            }

            ostringstream  stream;
            stream << "TreeNode(" << NodeId << "," << Height << ",";
            stream << "[";

            for (unsigned i=0; i<Indices.size(); i++) {
                if (i == Indices.size()-1) {
                    stream << Indices.at(i);
                } else {
                    stream << Indices.at(i) << ",";
                }
            }
            
            stream << "],";
            stream << "[" << children << ",";

            string output = stream.str();
            output.pop_back();
            output.append("]");
            output.append(")");

            return output;
        }
};

void reorder_strings(vector<string> &label_names, int* indices, int n) 
{ 
    vector<string> temp; 
    // indices's elements are the labels/indices of label_names
    // indices's positions (element index) are the new positions (element index)
    for (int i=0; i<n; i++) {
        temp.push_back(label_names.at(indices[i])); 
    }
  
    // Copy temp[] to col_names[] 
    for (int i=0; i<n; i++) 
    {  
       label_names.at(i) = temp.at(i); 
    } 
} 

template <typename T>
void reorder_matrix(T** &matrix, int* index, int num_data_rows, int num_data_cols, char axis) 
{ 
    if (axis != 0 && axis != 1) {
        cerr << endl << "Axis value must be 0 (column) or 1 (row)" << endl;
        return;
    }

    double **temp = new double*[num_data_rows];
    for (int i = 0; i < num_data_rows; i++ )
    {
        temp[i] = new double[num_data_cols];
        for (int j=0; j< num_data_cols; j++) 
        {
            if (axis == 1) {
                temp[i][j] = matrix[index[i]][j]; 
            }
            else {
                temp[i][j] = matrix[i][index[j]]; 
            }
        }
    }
  
    // Copy temp[] to col_names[] 
    for (int i=0; i<num_data_rows; i++) {
        for (int j=0; j< num_data_cols; j++) {
            matrix[i][j] = temp[i][j]; 
            // index[i] = i;
        }
    }

    // Deallocate memory
    for(int i = 0; i < num_data_rows; ++i) {
        free(temp[i]);
    }
    free(temp);

} 

void cluster_axis(int num_data_rows, int num_data_cols, char distance_func, char linkage_func, int axis, double** &heatmap_data, int** &mask, vector<string> &label_names, map<int, TreeNode> &node_dict){
    
        int num_data_leaves, nnodes;
        if (axis == 0){
            num_data_leaves = num_data_cols;
            nnodes = num_data_cols - 1;
        }
        else { // axis == 1
            num_data_leaves = num_data_rows;
            nnodes = num_data_rows - 1;
        }

        // Get dendrogram tree for axis 
        double *weights = new double[num_data_leaves];
        for(int i = 0; i < num_data_leaves; ++i) {
            weights[i] = 1.0;
        }
        Node* clust_tree = treecluster(num_data_rows, num_data_cols, heatmap_data, mask, weights, axis, distance_func, linkage_func, 0);
        if (!clust_tree)
        {
            cerr << ("treecluster routine failed due to insufficient memory") << endl;
            free(weights);
        }

        // Print tree data

        /*
        cerr << "Node     Item 1   Item 2    Distance\n" << endl;
        for(int i=0; i<nnodes; i++){
            cerr << -i-1 << "     " << clust_tree[i].left << "     " << clust_tree[i].right << "     " << clust_tree[i].distance << endl;
        }
        */;

        // Sort column tree nodes
        int *sorted_indices = new int[num_data_leaves];

        int sorted_index = 0;
        for (int i = 0; i < nnodes; i++) {
            if (clust_tree[i].left >= 0) {
                sorted_indices[sorted_index] = clust_tree[i].left;
                sorted_index++;
            }
            if (clust_tree[i].right >= 0) {
                sorted_indices[sorted_index] = clust_tree[i].right;
                sorted_index++;
            }
        }

        // Reorder column labels
        reorder_strings(label_names, sorted_indices, num_data_leaves);
        // Reorder heatmap columns
        reorder_matrix(heatmap_data, sorted_indices, num_data_rows, num_data_cols, axis);
        // Reorder mask columns
        reorder_matrix(mask, sorted_indices, num_data_rows, num_data_cols, axis);

        // Building TreeNode dict
        int cur_node_id = -1;

        // Remapping leaf indices due to sorting heatmap data: original index --> new index
        // We need this because the clustering algorithm mapped the tree according to the original col/row indices
        map<int,int> new_leaf_id;
        for (int i = 0; i < num_data_leaves; i++) {
            new_leaf_id[sorted_indices[i]] = i;
        }

        // Add leaves
        for(int i = 0; i < num_data_leaves; ++i) {
            TreeNode new_leaf;
            new_leaf.NodeId = i;
            new_leaf.Height = 0;
            new_leaf.Indices = {(int)i};
            new_leaf.Children = {};
            new_leaf.Label = label_names[i];
            if (axis == 0) {
                for (int j=0; j < num_data_cols; j++) {
                    new_leaf.Values.push_back(heatmap_data[i][j]);
                }
            }
            else {
                for (int j=0; j < num_data_rows; j++) {
                    new_leaf.Values.push_back(heatmap_data[j][i]);
                }
            }
            node_dict[i] = new_leaf;
        }

        // Add other nodes
        int cur_height = 1;
        
        for(int i=0; i<nnodes; i++){
            TreeNode new_tree_node;
            new_tree_node.Label = "Node " + to_string(abs(cur_node_id));
            new_tree_node.NodeId = cur_node_id;
            new_tree_node.Height = cur_height;
            
            int left_child_id = clust_tree[i].left;
            int right_child_id = clust_tree[i].right;
            if (left_child_id >= 0) {
                left_child_id = new_leaf_id[left_child_id];
            }
            if (right_child_id >= 0) {
                right_child_id = new_leaf_id[right_child_id];
            }

            // Add 2 Children
            new_tree_node.Children.push_back(&(node_dict[left_child_id]));
            new_tree_node.Children.push_back(&(node_dict[right_child_id]));

            // Add all leaves to Indices
            vector<int> left_child_indices = node_dict[left_child_id].Indices;
            vector<int> right_child_indices = node_dict[right_child_id].Indices;
            copy (left_child_indices.begin(), left_child_indices.end(), back_inserter(new_tree_node.Indices));
            copy (right_child_indices.begin(), right_child_indices.end(), back_inserter(new_tree_node.Indices));

            /*
            cerr << "New node: " << cur_node_id << endl;
            cerr << "children" << endl;
            for(int j=0; j < new_tree_node.Indices.size(); j++) {
                cerr << new_tree_node.Indices[j]
                << endl;
            }
            cerr << endl;
            */


            node_dict[cur_node_id] = new_tree_node;
            cur_node_id--;
            cur_height++;
        }

        free(clust_tree);
        free(weights);
}

napi_value ClusterC(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 1;
    size_t buf_size = 1048576; ///// might need to increase
    size_t input_bytes = 0;
    char input[buf_size];
    napi_value argv[1];
    status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);

    if (status != napi_ok) {
        napi_throw_error(env, NULL, "Failed to parse arguments");
    }

    status = napi_get_value_string_utf8(env, argv[0], input, buf_size, &input_bytes);

    if (input_bytes >= buf_size-1) {
        napi_throw_error(env, NULL, "Input too long");
    }

    if (status != napi_ok) {
        napi_throw_error(env, NULL, "Invalid input");
    }


    clock_t start, mid, mid2, end;
    start = clock();

    /* =========================== Input Parsing (Destringifying) =========================== */

    // Args: heatmap_input, distance_function, linkage_function, axes (which dendrograms -- rows/cols/both)) -- parse these args from incoming string

    // Intaking data
    string heatmap_input;
    string _distance_function;
    string _linkage_function;
    string axes;

    stringstream  input_stream(input);
    string tmp_string = "";
    int arg_num = 0;

    for(string line; getline(input_stream, line); ) {
        tmp_string = string(line);
        if (arg_num == 0) {
            // front padding: 16, back padding: 2
            heatmap_input = tmp_string.substr(16, tmp_string.length()-16-2);  // also getting rid of the '[' and ']' at the beginning and the end -- makes parsing later easier
        }
        if (arg_num == 1) {
            // front padding: 18, back padding: 1
            _distance_function = tmp_string.substr(18, tmp_string.length()-18-1);
        }
        if (arg_num == 2) {
            // front padding: 17, back padding: 1
            _linkage_function = tmp_string.substr(17, tmp_string.length()-17-1);
        }
        if (arg_num == 3) {
            // front padding: 5, back padding: 1
            axes = tmp_string.substr(5, tmp_string.length()-5-1);
        }
        arg_num += 1;
    }    

    // Checking for valid inputs and setting up additional parameters
    char distance_function = _distance_function[0];
    char linkage_function = _linkage_function[0];
    string possible_distance_functions = "cauxskeb";
    if (possible_distance_functions.find(distance_function) == string::npos) {
        cerr << endl << "Distance function given is not an option." << endl;
        cerr << "See readme for more info" << endl;
    }

    string possible_linkage_functions = "smac";
    if (possible_linkage_functions.find(linkage_function) == string::npos) {
        cerr << endl << "Linkage function given is not an option." << endl;
        cerr << "See readme for more info" << endl;
    }

    string possible_dendro_axes = "rcb";
    if (possible_dendro_axes.find(axes) == string::npos) {
        cerr << endl << "Axes given is not an option." << endl;
        cerr << "Should be 'r', 'c', or 'b' (row / col / both)" << endl;
    }

    bool col_dendro_flag = false;
    bool row_dendro_flag = false;
    if (axes == "c" || axes == "b") {
        col_dendro_flag = true;
    }
    if (axes == "r" || axes == "b") {
        row_dendro_flag = true;
    }

    int _second_bracket_idx = heatmap_input.find('[');
    int second_bracket_idx = heatmap_input.find('[', _second_bracket_idx+1);
    int num_data_cols = count(heatmap_input.begin(), heatmap_input.begin()+second_bracket_idx, ',') - 1; // subtract 1 to account for the comma separating rows
    int num_data_rows = count(heatmap_input.begin(), heatmap_input.end(), '[') - 1; // subtract 1 to account for the label row

    // Processing heatmap CSV data
    double **heatmap_data = new double*[num_data_rows];
    for(int i = 0; i < num_data_rows; i++) {
        heatmap_data[i] = new double[num_data_cols];
    }

    // Allocate array of data's column names
    vector<string> col_names;
    // Allocate array of data's row names
    vector<string> row_names;

    // Mask for missing data, needed by the hierarchical clustering algorithm
    int **mask = new int*[num_data_rows];
    for(int i = 0; i < num_data_rows; i++) {
        mask[i] = new int[num_data_cols];
    }

    float weight;
    int row_num = 0;
    int col_num = 0;

    stringstream  data(heatmap_input);
    string line;
    while(getline(data,line,']'))
    {
        stringstream  lineStream(line);
        string        cell;
        
        col_num = 0;

        while(getline(lineStream,cell,','))
        {
            // corner 0,0 is empty
            if (row_num == 0 && col_num == 0) {
                col_num += 1;
                continue;
            }
            // column label
            else if (row_num == 0){
                col_names.push_back(string(cell));
            }
            // skip the first comma ("first column"), since it's just the comma separating rows
            else if (col_num == 0){
                col_num += 1;
                continue;
            }
            // row label
            else if (col_num == 1){
                string _row_label = string(cell);
                string row_label(_row_label.begin()+1, _row_label.end()); // to get rid of the extra '[' at the front
                row_names.push_back(row_label);
            }
            // heatmap data cell
            else {
                weight = stof(cell);

                heatmap_data[row_num-1][col_num-2] = weight;
                if (!weight) {
                    mask[row_num-1][col_num-2] = 0;
                }
                else {
                    mask[row_num-1][col_num-2] = 1;
                }
            }

            col_num += 1;
        }
        row_num += 1;
    }

    mid = clock();

    /* =========================== Hierarchical clustering =========================== */
    map<int, TreeNode> col_node_dict;
    map<int, TreeNode> row_node_dict;

    if (col_dendro_flag) {
        cluster_axis(num_data_rows, num_data_cols, distance_function, linkage_function, 0, heatmap_data, mask, col_names, col_node_dict);
    }
    if (row_dendro_flag) {
        cluster_axis(num_data_rows, num_data_cols, distance_function, linkage_function, 1, heatmap_data, mask, row_names, row_node_dict);
    }

    mid2 = clock();

    /*
    cerr << "AFTER" << endl;
    for (int i = 0; i < num_data_rows; i++)
    {
        for (int j = 0; j < num_data_cols; j++)
        {
            cerr << heatmap_data[i][j] << ' ';
        }
        cerr << endl;
    }
    */

    /* =========================== Output Generation (Wrapping Napi Object) =========================== */                        

    napi_value return_napi_object;
    status = napi_create_object(env, &return_napi_object);
    if (status != napi_ok) {
        napi_throw_error(env, NULL, "Failed to create napi object");
    }

    // Creating napi keys and values
    string current_napi_key_name;
    current_napi_key_name = "matrix";
    napi_value napi_matrix_key;
    status = napi_create_string_utf8(env, current_napi_key_name.c_str(), current_napi_key_name.length(), &napi_matrix_key);
    current_napi_key_name = "rowLabels";
    napi_value napi_rowlabels_key;
    status = napi_create_string_utf8(env, current_napi_key_name.c_str(), current_napi_key_name.length(), &napi_rowlabels_key);
    current_napi_key_name = "colLabels";
    napi_value napi_collabels_key;
    status = napi_create_string_utf8(env, current_napi_key_name.c_str(), current_napi_key_name.length(), &napi_collabels_key);
    current_napi_key_name = "rowTree";
    napi_value napi_rowtree_key;
    status = napi_create_string_utf8(env, current_napi_key_name.c_str(), current_napi_key_name.length(), &napi_rowtree_key);
    current_napi_key_name = "colTree";
    napi_value napi_coltree_key;
    status = napi_create_string_utf8(env, current_napi_key_name.c_str(), current_napi_key_name.length(), &napi_coltree_key);

    napi_value napi_matrix_val;
    status = napi_create_array(env, &napi_matrix_val);
    for (int i = 0; i < num_data_rows; i++) {
        napi_value napi_cur_matrix_row;
        status = napi_create_array(env, &napi_cur_matrix_row);

        for (int j = 0; j < num_data_cols; j++) {
            napi_value napi_cell_value;
            status = napi_create_double(env, heatmap_data[i][j], &napi_cell_value);
            status = napi_set_element(env, napi_cur_matrix_row, j, napi_cell_value);
        }
        status = napi_set_element(env, napi_matrix_val, i, napi_cur_matrix_row);
    }

    napi_value napi_rowlabels_val;
    status = napi_create_array(env, &napi_rowlabels_val);
    for (int i = 0; i < num_data_rows; i++) {
        napi_value cur_row_name;
        status = napi_create_string_utf8(env, row_names[i].c_str(), row_names[i].length(), &cur_row_name);
        status = napi_set_element(env, napi_rowlabels_val, i, cur_row_name);
    }

    napi_value napi_collabels_val;
    status = napi_create_array(env, &napi_collabels_val);
    for (int i = 0; i < num_data_cols; i++) {
        napi_value cur_col_name;
        status = napi_create_string_utf8(env, col_names[i].c_str(), col_names[i].length(), &cur_col_name);
        status = napi_set_element(env, napi_collabels_val, i, cur_col_name);
    }

    napi_value napi_rowtree_val;
    if (row_dendro_flag) {
        status = row_node_dict[-(num_data_rows-1)].napify(env, &napi_rowtree_val);
    }
    else {
        status = napi_get_null(env, &napi_rowtree_val);
    }

    napi_value napi_coltree_val;
    if (col_dendro_flag) {
        status = col_node_dict[-(num_data_cols-1)].napify(env, &napi_coltree_val);
    }
    else {
        status = napi_get_null(env, &napi_coltree_val);
    }

    // Setting keys and values for return
    status = napi_set_property(env, return_napi_object, napi_matrix_key, napi_matrix_val);
    status = napi_set_property(env, return_napi_object, napi_rowlabels_key, napi_rowlabels_val);
    status = napi_set_property(env, return_napi_object, napi_collabels_key, napi_collabels_val);
    status = napi_set_property(env, return_napi_object, napi_rowtree_key, napi_rowtree_val);
    status = napi_set_property(env, return_napi_object, napi_coltree_key, napi_coltree_val);

    // De-allocating data arrays
    for(int i = 0; i < num_data_rows; ++i) {
        delete [] heatmap_data[i];
    }
    delete [] heatmap_data;

    end = clock();
    double time_input = double(mid-start)/double(CLOCKS_PER_SEC);
    double time_clustering = double(mid2-mid)/double(CLOCKS_PER_SEC);
    double time_output = double(end-mid2)/double(CLOCKS_PER_SEC);
    double time_taken_overall = double(end-start)/double(CLOCKS_PER_SEC);

    cerr << "Input destringifying time : " << fixed 
         << time_input << setprecision(5); 
    cerr << " sec " << endl; 
    cerr << "Clustering time : " << fixed 
         << time_clustering << setprecision(5); 
    cerr << " sec " << endl; 
    cerr << "Output stringifying time : " << fixed 
         << time_output << setprecision(5); 
    cerr << " sec " << endl; 
    cerr << "Overall time taken by program is : " << fixed 
         << time_taken_overall << setprecision(5); 
    cerr << " sec " << endl; 

    if (status != napi_ok) {
        napi_throw_error(env, NULL, "Unable to create return value");
    }

    return return_napi_object;
}

napi_value Init(napi_env env, napi_value exports) {
  napi_status status;
  napi_value fn;

  status = napi_create_function(env, NULL, 0, ClusterC, NULL, &fn);
  if (status != napi_ok) {
    napi_throw_error(env, NULL, "Unable to wrap native function");
  }

  status = napi_set_named_property(env, exports, "ccluster", fn);
  if (status != napi_ok) {
    napi_throw_error(env, NULL, "Unable to populate exports");
  }

  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)