#include <algorithm>
#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <map>
#include <vector>
#include <string.h>
extern "C" {
    #include "cluster.h"
}
using namespace std;

class TreeNode {
    public:
        int NodeId;
        float Height;
        vector<int> Indices;
        vector<TreeNode> Children;
};

class Leaf : public TreeNode {
    public:
        string Label;
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
    string possible_axes = "rc";
    if (possible_axes.find(axis) == string::npos) {
        cerr << endl << "Axis value must be 'r' (row) or 'c' (column)" << endl;
        return;
    }

    double **temp = new double*[num_data_rows];
    for (int i = 0; i < num_data_rows; i++ )
    {
        temp[i] = new double[num_data_cols];
        for (int j=0; j< num_data_cols; j++) 
        {
            if (axis == 'r') {
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

int main()
{  
    
    clock_t start, mid, mid2, end;
    start = clock();

    string input = "{heatmap_input:[[,col1,col2],[row1,1,2],[row2,3,4]],\ndistance_function:e,\nlinkage_function:a,\naxes:r}";

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

        return 1;
    }

    string possible_linkage_functions = "smac";
    if (possible_linkage_functions.find(linkage_function) == string::npos) {
        cerr << endl << "Linkage function given is not an option." << endl;
        cerr << "See readme for more info" << endl;

        return 1;
    }

    string possible_dendro_axes = "rcb";
    if (possible_dendro_axes.find(axes) == string::npos) {
        cerr << endl << "Axes given is not an option." << endl;
        cerr << "Should be 'r', 'c', or 'b' (row / col / both)" << endl;

        return 1;
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
    int cur_col_node_id = -1;
    map<int, TreeNode> row_node_dict;
    int cur_row_node_id = -1;

    if (col_dendro_flag) {
        int col_nnodes = num_data_cols-1;

        // Get dendrogram tree for column data
        double *col_weight = new double[num_data_cols];
        for(int i = 0; i < num_data_cols; ++i) {
            col_weight[i] = 1.0;
        }
        Node* col_tree = treecluster(num_data_rows, num_data_cols, heatmap_data, mask, col_weight, 1, distance_function, linkage_function, 0);
        if (!col_tree)
        {
            cerr << ("treecluster routine failed due to insufficient memory") << endl;
            free(col_weight);
            return 1;
        }

        // Print tree data
        cerr << "Node     Item 1   Item 2    Distance\n" << endl;
        for(int i=0; i<col_nnodes; i++){
            cerr << -i-1 << "     " << col_tree[i].left << "     " << col_tree[i].right << "     " << col_tree[i].distance << endl;
        }

        // Sort column tree nodes
        int *col_sorted_indices = new int[num_data_cols];

        int col_sorted_index = 0;
        for (int i = 0; i < col_nnodes; i++) {
            if (col_tree[i].left >= 0) {
                col_sorted_indices[col_sorted_index] = col_tree[i].left;
                col_sorted_index++;
            }
            if (col_tree[i].right >= 0) {
                col_sorted_indices[col_sorted_index] = col_tree[i].right;
                col_sorted_index++;
            }
        }


        // Reorder column labels
        reorder_strings(col_names, col_sorted_indices, num_data_cols);
        // Reorder heatmap columns
        reorder_matrix(heatmap_data, col_sorted_indices, num_data_rows, num_data_cols, 'c');
        // Reorder mask columns
        reorder_matrix(mask, col_sorted_indices, num_data_rows, num_data_cols, 'c');

        // Creating TreeNode dict

        //// TODO: May need to remap leaf indices due to sorting heatmap data

        // Add leaves
        for(int i = 0; i < num_data_cols; ++i) {
            Leaf  new_leaf;
            new_leaf.NodeId = i;
            new_leaf.Height = 0;
            new_leaf.Indices = {(int)i};
            new_leaf.Children = {};
            new_leaf.Label = col_names[i];
            col_node_dict[i] = new_leaf;
        }

        // Add other nodes
        int cur_height = 1;
        
        for(int i=0; i<col_nnodes; i++){
            TreeNode new_tree_node;
            new_tree_node.NodeId = cur_col_node_id;
            new_tree_node.Height = cur_height;
            
            int left_child_id = col_tree[i].left;
            int right_child_id = col_tree[i].right;

            // Add all descendents to Children
            new_tree_node.Children.push_back(col_node_dict[left_child_id]);
            new_tree_node.Children.push_back(col_node_dict[right_child_id]);
            vector<TreeNode> left_child_children = col_node_dict[left_child_id].Children;
            vector<TreeNode> right_child_children = col_node_dict[right_child_id].Children;
            copy (left_child_children.begin(), left_child_children.end(), back_inserter(new_tree_node.Children));
            copy (right_child_children.begin(), right_child_children.end(), back_inserter(new_tree_node.Children));

            // Add itself and all descendents to Indices
            new_tree_node.Indices.push_back(cur_col_node_id);
            vector<int> left_child_indices = col_node_dict[left_child_id].Indices;
            vector<int> right_child_indices = col_node_dict[right_child_id].Indices;
            copy (left_child_indices.begin(), left_child_indices.end(), back_inserter(new_tree_node.Indices));
            copy (right_child_indices.begin(), right_child_indices.end(), back_inserter(new_tree_node.Indices));

            /*
            cerr << "New node: " << cur_col_node_id << endl;
            cerr << "children" << endl;
            for(int j=0; j < new_tree_node.Indices.size(); j++) {
                cerr << new_tree_node.Indices[j]
                << endl;
            }
            cerr << endl;
            */


            col_node_dict[cur_col_node_id] = new_tree_node;
            cur_col_node_id--;
            cur_height++;
        }

        free(col_tree);
        free(col_weight);

    }

    if (row_dendro_flag) {
        int row_nnodes = num_data_rows-1;

        double *row_weight = new double[num_data_rows];
        for(int i = 0; i < num_data_rows; ++i) {
            row_weight[i] = 1.0;
        }
        Node* row_tree = treecluster(num_data_rows, num_data_cols, heatmap_data, mask, row_weight, 0, distance_function, linkage_function, 0);

        if (!row_tree)
        {
            cerr << ("treecluster routine failed due to insufficient memory\n");
            free(row_weight);
            return 1;
        }

        // Sort row tree nodes
        int *row_sorted_indices = new int[num_data_rows];

        int row_sorted_index = 0;
        for (int i = 0; i < row_nnodes; i++) {
            if (row_tree[i].left >= 0) {
                row_sorted_indices[row_sorted_index] = row_tree[i].left;
                row_sorted_index++;
            }
            if (row_tree[i].right >= 0) {
                row_sorted_indices[row_sorted_index] = row_tree[i].right;
                row_sorted_index++;
            }
        }

        // Reorder row labels
        reorder_strings(row_names, row_sorted_indices, num_data_rows);
        // Reorder heatmap rows
        reorder_matrix(heatmap_data, row_sorted_indices, num_data_rows, num_data_cols, 'r');
        // Reorder mask
        reorder_matrix(mask, row_sorted_indices, num_data_rows, num_data_cols, 'r');

        // Creating TreeNode dict

        //// TODO: May need to remap leaf indices due to sorting heatmap data

        // Add leaves
        for(int i = 0; i < num_data_rows; ++i) {
            Leaf  new_leaf;
            new_leaf.NodeId = i;
            new_leaf.Height = 0;
            new_leaf.Indices = {(int)i};
            new_leaf.Children = {};
            new_leaf.Label = row_names[i];
            row_node_dict[i] = new_leaf;
        }

        // Add other nodes
        int cur_height = 1;
        
        for(int i=0; i<row_nnodes; i++){
            TreeNode new_tree_node;
            new_tree_node.NodeId = cur_row_node_id;
            new_tree_node.Height = cur_height;
            
            int left_child_id = row_tree[i].left;
            
            int right_child_id = row_tree[i].right;

            // Add all descendents to Children
            new_tree_node.Children.push_back(row_node_dict[left_child_id]);
            new_tree_node.Children.push_back(row_node_dict[right_child_id]);
            vector<TreeNode> left_child_children = row_node_dict[left_child_id].Children;
            vector<TreeNode> right_child_children = row_node_dict[right_child_id].Children;
            copy (left_child_children.begin(), left_child_children.end(), back_inserter(new_tree_node.Children));
            copy (right_child_children.begin(), right_child_children.end(), back_inserter(new_tree_node.Children));

            // Add itself and all descendents to Indices
            new_tree_node.Indices.push_back(cur_row_node_id);
            vector<int> left_child_indices = row_node_dict[left_child_id].Indices;
            vector<int> right_child_indices = row_node_dict[right_child_id].Indices;
            copy (left_child_indices.begin(), left_child_indices.end(), back_inserter(new_tree_node.Indices));
            copy (right_child_indices.begin(), right_child_indices.end(), back_inserter(new_tree_node.Indices));
            
            row_node_dict[cur_row_node_id] = new_tree_node;
            cur_row_node_id--;
            cur_height++;
        }

        // Free memory used during hierarchical clustering
        free(row_tree);
        free(row_weight);
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

    /* =========================== Output Generation (Stringifying) =========================== */

    string output = "{heatmap:[";
    for (int i = 0; i < num_data_rows; i++ )
    {
        output.append("[");
        for (int j=0; j< num_data_cols; j++) 
        {
            output.append(to_string(heatmap_data[i][j]) + ",");
        }
        output.pop_back();
        output.append("]");
    }

    output.append("],\ncol_labels:[");
    for (int i = 0; i < num_data_cols; i++) {
        output.append(col_names.at(i) + ",");
    }
    output.pop_back();

    output.append("],\nrow_labels:[");
    for (int i = 0; i < num_data_rows; i++) {
        output.append(row_names.at(i) + ",");
    }
    output.pop_back();

    output.append("],\ncol_tree:");
    if (col_dendro_flag) {
        /// Stringify col tree and append to output
        TreeNode col_root = row_node_dict[cur_col_node_id+1];
        // output.append(string(col_root))
        cerr << "";
    }
    else {
        output.append("None");
    }

    output.append(",\nrow_tree:");
    if (row_dendro_flag) {
        /// Stringify row tree and append to output
        TreeNode row_root = row_node_dict[cur_row_node_id+1];
        // output.append(string(row_root))
        cerr << "";
    }
    else {
        output.append("None");
    }

    output.append("}");

    cerr << endl << "OUTPUT" << endl << output << endl << endl ;

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

    return 0;
}
